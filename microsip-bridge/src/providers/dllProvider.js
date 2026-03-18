import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_SHELL = 'powershell';
const WINDOWS_X86_POWERSHELL = 'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bridgeRoot = path.resolve(__dirname, '..', '..');

const toInteger = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
};

const trimText = (value, fallback = '') => {
    const normalized = String(value || '').trim();
    return normalized || fallback;
};

const resolveScriptPath = () => {
    const configured = trimText(process.env.MICROSIP_ADAPTER_SCRIPT_PATH);
    const defaultPath = path.resolve(bridgeRoot, 'adapters', 'powershell', 'MicrosipApiAdapter.ps1');
    if (!configured) {
        return defaultPath;
    }

    if (path.isAbsolute(configured)) {
        return configured;
    }

    return path.resolve(bridgeRoot, configured);
};

const resolveDefaultShell = () => {
    if (process.platform !== 'win32') {
        return DEFAULT_SHELL;
    }

    if (existsSync(WINDOWS_X86_POWERSHELL)) {
        return WINDOWS_X86_POWERSHELL;
    }

    return DEFAULT_SHELL;
};

const shellCommand = trimText(process.env.MICROSIP_ADAPTER_SHELL, resolveDefaultShell());
const adapterScriptPath = resolveScriptPath();
const adapterTimeoutMs = toInteger(process.env.MICROSIP_ADAPTER_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);

const parseJsonOutput = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return null;
    }

    try {
        return JSON.parse(normalized);
    } catch {
        const lines = normalized
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        for (let index = lines.length - 1; index >= 0; index -= 1) {
            try {
                return JSON.parse(lines[index]);
            } catch {
                // Continue looking for a valid JSON line.
            }
        }

        return null;
    }
};

const buildContextBase64 = (context = {}) => {
    const payload = JSON.stringify(context || {});
    return Buffer.from(payload, 'utf8').toString('base64');
};

const buildAdapterError = (message, details = {}) => {
    const error = new Error(message);
    error.code = 'MICROSIP_DLL_ADAPTER_ERROR';
    error.details = details;
    return error;
};

const runAdapter = (dataset, context = {}) => new Promise((resolve, reject) => {
    const args = [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        adapterScriptPath,
        '-Dataset',
        dataset,
        '-ContextBase64',
        buildContextBase64(context),
    ];

    const child = spawn(shellCommand, args, {
        cwd: bridgeRoot,
        env: process.env,
        windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let timeoutHandle = null;

    const clearTimer = () => {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
        }
    };

    timeoutHandle = setTimeout(() => {
        child.kill('SIGKILL');
        reject(buildAdapterError('Tiempo de espera agotado al consultar adaptador de Microsip', {
            dataset,
            timeout_ms: adapterTimeoutMs,
        }));
    }, adapterTimeoutMs);

    child.stdout.on('data', (chunk) => {
        stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
        clearTimer();
        reject(buildAdapterError('No fue posible iniciar el proceso del adaptador Microsip', {
            dataset,
            shell: shellCommand,
            script_path: adapterScriptPath,
            error: error.message,
        }));
    });

    child.on('close', (exitCode) => {
        clearTimer();
        const parsedStdout = parseJsonOutput(stdout);
        const parsedStderr = parseJsonOutput(stderr);

        if (exitCode !== 0) {
            const message = parsedStderr?.message
                || parsedStdout?.message
                || String(stderr || stdout || 'Error desconocido del adaptador Microsip').trim();
            reject(buildAdapterError(message, {
                dataset,
                exit_code: exitCode,
                shell: shellCommand,
                script_path: adapterScriptPath,
                stderr: String(stderr || '').trim() || null,
            }));
            return;
        }

        const payload = parsedStdout || parsedStderr;
        if (!payload || typeof payload !== 'object') {
            reject(buildAdapterError('Respuesta invalida del adaptador Microsip', {
                dataset,
                shell: shellCommand,
                script_path: adapterScriptPath,
                stdout: String(stdout || '').trim() || null,
                stderr: String(stderr || '').trim() || null,
            }));
            return;
        }

        if (payload.ok === false) {
            reject(buildAdapterError(payload.message || 'Adaptador Microsip retorno error', {
                dataset,
                shell: shellCommand,
                script_path: adapterScriptPath,
                payload,
            }));
            return;
        }

        resolve(payload);
    });
});

const toArray = (value) => (Array.isArray(value) ? value : []);

const exportCollection = async (dataset, context = {}) => {
    const payload = await runAdapter(dataset, context);
    return toArray(payload.items || payload.data || []);
};

export const createDllProvider = () => ({
    mode: 'dll',
    async health(context = {}) {
        const payload = await runAdapter('health', context);
        return {
            ok: true,
            provider: 'dll',
            adapter: {
                shell: shellCommand,
                script_path: adapterScriptPath,
                timeout_ms: adapterTimeoutMs,
            },
            upstream: payload,
        };
    },
    async exportDepartments(context = {}) {
        return exportCollection('departments', context);
    },
    async exportJobTitles(context = {}) {
        return exportCollection('job_titles', context);
    },
    async exportEmployees(context = {}) {
        return exportCollection('employees', context);
    },
});
