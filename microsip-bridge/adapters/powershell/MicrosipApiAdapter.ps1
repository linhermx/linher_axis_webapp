param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('health', 'departments', 'job_titles', 'employees', 'countries', 'states', 'cities', 'payroll_payments')]
    [string]$Dataset,
    [string]$ContextBase64 = ''
)

$ErrorActionPreference = 'Stop'

# Force UTF-8 stdout/stderr so Node bridge can parse accents correctly.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

function Convert-ToBool {
    param(
        [Parameter(Mandatory = $false)][AllowNull()]
        $Value,
        [bool]$Default = $false
    )

    if ($null -eq $Value) {
        return $Default
    }

    $normalized = [string]$Value
    if ([string]::IsNullOrWhiteSpace($normalized)) {
        return $Default
    }

    return @('1', 'true', 'yes', 'on') -contains $normalized.Trim().ToLowerInvariant()
}

function Convert-ToInt {
    param(
        [Parameter(Mandatory = $false)][AllowNull()]
        $Value,
        [int]$Default = 0
    )

    $parsed = 0
    if ([int]::TryParse([string]$Value, [ref]$parsed)) {
        if ($parsed -gt 0) {
            return $parsed
        }
    }

    return $Default
}

function Split-Fields {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return @()
    }

    return $Value.Split(',') `
        | ForEach-Object { $_.Trim() } `
        | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
}

function Resolve-FieldMappings {
    param(
        [string[]]$Tokens
    )

    $mappings = New-Object System.Collections.Generic.List[object]
    foreach ($token in $Tokens) {
        $raw = [string]$token
        if ([string]::IsNullOrWhiteSpace($raw)) {
            continue
        }

        $parts = $raw.Split(':', 2)
        if ($parts.Count -eq 2) {
            $target = $parts[0].Trim()
            $source = $parts[1].Trim()
        } else {
            $target = $raw.Trim()
            $source = $raw.Trim()
        }

        if ([string]::IsNullOrWhiteSpace($target) -or [string]::IsNullOrWhiteSpace($source)) {
            continue
        }

        $mappings.Add([pscustomobject]@{
            target = $target
            source = $source
        })
    }

    return $mappings
}

function Decode-Context {
    param([string]$Base64Value)

    if ([string]::IsNullOrWhiteSpace($Base64Value)) {
        return @{}
    }

    try {
        $json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Base64Value))
        if ([string]::IsNullOrWhiteSpace($json)) {
            return @{}
        }

        return ConvertFrom-Json -InputObject $json -AsHashtable
    } catch {
        return @{}
    }
}

function Get-LastApiError {
    $builder = New-Object System.Text.StringBuilder 4096
    [void][MicrosipNative]::GetLastErrorMessage($builder)
    $message = $builder.ToString().Trim([char]0).Trim()
    $code = [MicrosipNative]::GetLastErrorCode()
    if ([string]::IsNullOrWhiteSpace($message)) {
        $message = 'Error desconocido reportado por ApiMicrosip.dll'
    }

    return @{
        code = $code
        message = $message
    }
}

function Throw-ApiError {
    param(
        [string]$Action,
        [int]$Result = -1
    )

    $last = Get-LastApiError
    throw "$Action fallo (result=$Result, api_code=$($last.code)): $($last.message)"
}

function Ensure-StatusOk {
    param(
        [string]$Action,
        [int]$ResultCode
    )

    if ($ResultCode -ne 0) {
        Throw-ApiError -Action $Action -Result $ResultCode
    }
}

function Ensure-NewHandle {
    param(
        [string]$Action,
        [int]$HandleValue
    )

    if ($HandleValue -le 0) {
        Throw-ApiError -Action $Action -Result $HandleValue
    }
}

function Ensure-NonNegativeHandle {
    param(
        [string]$Action,
        [int]$HandleValue
    )

    if ($HandleValue -lt 0) {
        Throw-ApiError -Action $Action -Result $HandleValue
    }
}

function Read-SqlStringField {
    param(
        [int]$SqlHandle,
        [string]$FieldName
    )

    $candidates = @(
        $FieldName,
        $FieldName.ToUpperInvariant(),
        $FieldName.ToLowerInvariant()
    ) | Select-Object -Unique

    foreach ($candidate in $candidates) {
        $builder = New-Object System.Text.StringBuilder 8192
        $result = [MicrosipNative]::SqlGetFieldAsString($SqlHandle, $candidate, $builder)
        if ($result -ne 0) {
            continue
        }

        $value = $builder.ToString().Trim([char]0).Trim()
        if ([string]::IsNullOrWhiteSpace($value)) {
            return $null
        }

        return $value
    }
    
    return $null
}

function Open-Connection {
    param(
        [string]$DatabaseName,
        [string]$UserName,
        [string]$Password
    )

    # Usar el DB handle default (0) evita el requisito de crear transaccion
    # manual antes de DBConnect para un DB handle nuevo.
    $dbHandle = 0
    $connectResult = [MicrosipNative]::DBConnect($dbHandle, $DatabaseName, $UserName, $Password)
    Ensure-StatusOk -Action 'DBConnect' -ResultCode $connectResult

    $connected = [MicrosipNative]::DBConnected($dbHandle)
    if ($connected -ne 1) {
        Throw-ApiError -Action 'DBConnected' -Result $connected
    }

    $trnHandle = [MicrosipNative]::DBGetDefaultTrn($dbHandle)
    Ensure-NonNegativeHandle -Action 'DBGetDefaultTrn' -HandleValue $trnHandle

    # 0=exito, 2=ya activa.
    $trnStartResult = [MicrosipNative]::TrnStart($trnHandle)
    if ($trnStartResult -ne 0 -and $trnStartResult -ne 2) {
        Throw-ApiError -Action 'TrnStart' -Result $trnStartResult
    }

    return @{
        db = $dbHandle
        trn = $trnHandle
    }
}

function Close-Connection {
    param([hashtable]$Connection)

    if ($null -eq $Connection) {
        return
    }

    try { [void][MicrosipNative]::DBCloseDatasets($Connection.db) } catch {}
    try { [void][MicrosipNative]::DBDisconnect($Connection.db) } catch {}
    try { [MicrosipNative]::LiberarRecursos() } catch {}
}

function Execute-Query {
    param(
        [hashtable]$Connection,
        [string]$Query,
        [object[]]$Fields,
        [int]$Limit
    )

    $sqlHandle = [MicrosipNative]::NewSql($Connection.trn)
    Ensure-NewHandle -Action 'NewSql' -HandleValue $sqlHandle

    try {
        $queryResult = [MicrosipNative]::SqlQry($sqlHandle, $Query)
        Ensure-StatusOk -Action 'SqlQry' -ResultCode $queryResult

        $execResult = [MicrosipNative]::SqlExecQuery($sqlHandle)
        Ensure-StatusOk -Action 'SqlExecQuery' -ResultCode $execResult

        $recordCountApi = [MicrosipNative]::SqlRecordCount($sqlHandle)
        if ($recordCountApi -eq 0) {
            $lastCode = [MicrosipNative]::GetLastErrorCode()
            if ($lastCode -ne 0) {
                Throw-ApiError -Action 'SqlRecordCount' -Result $lastCode
            }
        }

        $rows = New-Object System.Collections.Generic.List[object]
        if ($recordCountApi -gt 0) {
            $rowsToRead = if ($Limit -gt 0) { [Math]::Min($Limit, $recordCountApi) } else { $recordCountApi }
            for ($index = 0; $index -lt $rowsToRead; $index += 1) {
                $row = [ordered]@{}
                foreach ($field in $Fields) {
                    $row[$field.target] = Read-SqlStringField -SqlHandle $sqlHandle -FieldName $field.source
                }
                $rows.Add([pscustomobject]$row)

                if ($index -lt ($rowsToRead - 1)) {
                    $nextResult = [MicrosipNative]::SqlNext($sqlHandle)
                    Ensure-StatusOk -Action 'SqlNext' -ResultCode $nextResult
                }
            }
        }

        return @{ rows = $rows; record_count = $recordCountApi }
    } finally {
        try { [void][MicrosipNative]::SqlClose($sqlHandle) } catch {}
    }
}

function Resolve-DatasetConfig {
    param([string]$Name)

    switch ($Name) {
        'departments' {
            return @{
                query = $env:MICROSIP_SQL_DEPARTMENTS
                fields = Split-Fields -Value $env:MICROSIP_FIELDS_DEPARTMENTS
                fallbackFields = @('microsip_department_id', 'name', 'is_active')
            }
        }
        'job_titles' {
            return @{
                query = $env:MICROSIP_SQL_JOB_TITLES
                fields = Split-Fields -Value $env:MICROSIP_FIELDS_JOB_TITLES
                fallbackFields = @('microsip_job_title_id', 'name', 'is_active')
            }
        }
        'employees' {
            return @{
                query = $env:MICROSIP_SQL_EMPLOYEES
                fields = Split-Fields -Value $env:MICROSIP_FIELDS_EMPLOYEES
                fallbackFields = @(
                    'microsip_employee_id',
                    'employee_number',
                    'first_name',
                    'last_name',
                    'department_id',
                    'job_title_id',
                    'employment_status',
                    'hired_at',
                    'terminated_at',
                    'daily_salary',
                    'integrated_daily_salary',
                    'salary_currency',
                    'salary_type',
                    'payroll_regime',
                    'social_security_number',
                    'imss_clinic_code',
                    'imss_employee_contribution',
                    'imss_employer_contribution',
                    'imss_total_contribution',
                    'imss_contribution_base',
                    'manager_microsip_employee_id',
                    'manager_name',
                    'contract_type',
                    'payment_method',
                    'shift_code',
                    'shift_name',
                    'schedule',
                    'workday_hours',
                    'payroll_regime_code',
                    'sat_contract_code',
                    'sat_workday_code',
                    'sat_entry_code',
                    'is_unionized',
                    'antiquity_table_code',
                    'salary_hourly',
                    'integration_percentage',
                    'social_security_enabled',
                    'cas_enabled',
                    'ptu_enabled',
                    'tax_disabled',
                    'calculate_annual_isr',
                    'files_declaration',
                    'employer_registry_id',
                    'social_min_zone',
                    'pensioned',
                    'pension_type',
                    'sex_code',
                    'birth_date',
                    'birth_city_id',
                    'marital_status_code',
                    'children_count',
                    'rfc',
                    'curp',
                    'other_registry',
                    'email',
                    'phone_primary',
                    'phone_secondary',
                    'full_address',
                    'street_name',
                    'exterior_number',
                    'interior_number',
                    'neighborhood',
                    'locality',
                    'reference_note',
                    'city_id',
                    'postal_code',
                    'father_name',
                    'mother_name',
                    'payment_group_code',
                    'payment_account_type',
                    'payment_account_number'
                )
            }
        }
        'countries' {
            return @{
                query = $env:MICROSIP_SQL_COUNTRIES
                fields = Split-Fields -Value $env:MICROSIP_FIELDS_COUNTRIES
                fallbackFields = @(
                    'microsip_country_id',
                    'name',
                    'abbrev',
                    'fiscal_key',
                    'is_default',
                    'is_active'
                )
            }
        }
        'states' {
            return @{
                query = $env:MICROSIP_SQL_STATES
                fields = Split-Fields -Value $env:MICROSIP_FIELDS_STATES
                fallbackFields = @(
                    'microsip_state_id',
                    'microsip_country_id',
                    'name',
                    'abbrev',
                    'fiscal_key',
                    'is_default',
                    'is_active'
                )
            }
        }
        'cities' {
            return @{
                query = $env:MICROSIP_SQL_CITIES
                fields = Split-Fields -Value $env:MICROSIP_FIELDS_CITIES
                fallbackFields = @(
                    'microsip_city_id',
                    'microsip_state_id',
                    'name',
                    'fiscal_key',
                    'is_default',
                    'is_active'
                )
            }
        }
        'payroll_payments' {
            return @{
                query = $env:MICROSIP_SQL_PAYROLL_PAYMENTS
                fields = Split-Fields -Value $env:MICROSIP_FIELDS_PAYROLL_PAYMENTS
                fallbackFields = @(
                    'microsip_payroll_payment_id',
                    'payroll_batch_id',
                    'microsip_employee_id',
                    'job_title_id',
                    'department_id',
                    'workday_hours',
                    'salary_type',
                    'integrated_salary',
                    'work_days',
                    'work_hours',
                    'vacation_days',
                    'cotization_days',
                    'absences_days',
                    'incapacity_days',
                    'overtime_hours',
                    'overtime_excess_hours',
                    'overtime_excess_amount',
                    'base_contribution_salary',
                    'total_earnings',
                    'total_deductions',
                    'total_other_payments',
                    'total_earnings_taxable',
                    'total_earnings_exempt',
                    'state_tax_base',
                    'ptu_base',
                    'payment_date',
                    'payroll_type',
                    'payment_method',
                    'payment_type',
                    'is_applied',
                    'is_sent',
                    'sent_email'
                )
            }
        }
        default {
            throw "Dataset no soportado: $Name"
        }
    }
}

$context = Decode-Context -Base64Value $ContextBase64
$databaseName = [string]$env:MICROSIP_DATABASE_NAME
$databaseUser = [string]$env:MICROSIP_DATABASE_USER
$databasePassword = [string]$env:MICROSIP_DATABASE_PASSWORD
$dllPath = [string]$env:MICROSIP_DLL_PATH

if ([string]::IsNullOrWhiteSpace($dllPath)) {
    $errorPayload = @{
        ok = $false
        message = 'MICROSIP_DLL_PATH no esta configurada'
        dataset = $Dataset
    }
    ($errorPayload | ConvertTo-Json -Depth 10 -Compress)
    exit 1
}

if (-not (Test-Path -LiteralPath $dllPath)) {
    $errorPayload = @{
        ok = $false
        message = 'No se encontro ApiMicrosip.dll en MICROSIP_DLL_PATH'
        dataset = $Dataset
        dll_path = $dllPath
    }
    ($errorPayload | ConvertTo-Json -Depth 10 -Compress)
    exit 1
}

if ([string]::IsNullOrWhiteSpace($databaseName) -or [string]::IsNullOrWhiteSpace($databaseUser)) {
    $errorPayload = @{
        ok = $false
        message = 'Falta configurar MICROSIP_DATABASE_NAME y/o MICROSIP_DATABASE_USER'
        dataset = $Dataset
    }
    ($errorPayload | ConvertTo-Json -Depth 10 -Compress)
    exit 1
}

$dllDirectory = Split-Path -Path $dllPath -Parent
$dllName = Split-Path -Path $dllPath -Leaf

$nativeCode = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class MicrosipNative
{
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool SetDllDirectory(string lpPathName);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int GetLastErrorCode();

    [DllImport("$dllName", SetLastError = true)]
    public static extern int GetLastErrorMessage(StringBuilder errorMessage);

    [DllImport("$dllName", SetLastError = true)]
    public static extern void LiberarRecursos();

    [DllImport("$dllName", SetLastError = true)]
    public static extern int NewDB();

    [DllImport("$dllName", SetLastError = true)]
    public static extern int DBConnect(int dbHandle, string databaseName, string userName, string password);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int DBConnected(int dbHandle);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int DBDisconnect(int dbHandle);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int DBCloseDatasets(int dbHandle);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int DBGetDefaultTrn(int dbHandle);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int NewTrn(int dbHandle, int trnType);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int TrnStart(int trnHandle);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int NewSql(int trnHandle);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int SqlQry(int sqlHandle, string query);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int SqlExecQuery(int sqlHandle);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int SqlClose(int sqlHandle);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int SqlNext(int sqlHandle);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int SqlEof(int sqlHandle);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int SqlRecordCount(int sqlHandle);

    [DllImport("$dllName", SetLastError = true)]
    public static extern int SqlGetFieldAsString(int sqlHandle, string fieldName, StringBuilder fieldValue);

}
"@

Add-Type -TypeDefinition $nativeCode -Language CSharp
[void][MicrosipNative]::SetDllDirectory($dllDirectory)

$connection = $null

try {
    $connection = Open-Connection -DatabaseName $databaseName -UserName $databaseUser -Password $databasePassword

    if ($Dataset -eq 'health') {
        $healthPayload = @{
            ok = $true
            dataset = 'health'
            connected = $true
            database_name = $databaseName
            request_id = $context.request_id
        }
        ($healthPayload | ConvertTo-Json -Depth 10 -Compress)
        exit 0
    }

    $datasetConfig = Resolve-DatasetConfig -Name $Dataset
    $query = [string]$datasetConfig.query
    $fieldTokens = $datasetConfig.fields
    if ($fieldTokens.Count -eq 0) {
        $fieldTokens = $datasetConfig.fallbackFields
    }
    $fieldMappings = Resolve-FieldMappings -Tokens $fieldTokens

    if ([string]::IsNullOrWhiteSpace($query)) {
        throw "Falta configurar query para dataset $Dataset (variable de entorno MICROSIP_SQL_*)"
    }

    $limit = Convert-ToInt -Value $context.limit -Default 0
    $queryResult = Execute-Query -Connection $connection -Query $query -Fields $fieldMappings -Limit $limit
    $items = $queryResult.rows

    $payload = @{
        ok = $true
        dataset = $Dataset
        items = $items
        total = $items.Count
        record_count = $queryResult.record_count
        request_id = $context.request_id
    }

    ($payload | ConvertTo-Json -Depth 12 -Compress)
    exit 0
} catch {
    $errorPayload = @{
        ok = $false
        dataset = $Dataset
        message = $_.Exception.Message
        request_id = $context.request_id
    }

    ($errorPayload | ConvertTo-Json -Depth 10 -Compress)
    exit 1
} finally {
    Close-Connection -Connection $connection
}
