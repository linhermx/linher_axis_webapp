import { cn } from '../../lib/cn';
import { getInitials, normalizeText } from '../../lib/identity';

const Avatar = ({
  initials = '',
  name = '',
  src = '',
  alt = '',
  onImageError,
  size = 'md',
  tone = 'primary',
  stacked = false,
  className,
  ...props
}) => {
  const resolvedName = normalizeText(name);
  const resolvedInitials = normalizeText(initials) || getInitials(resolvedName, { fallback: 'NA' });
  const normalizedSrc = normalizeText(src);
  const imageAlt = normalizeText(alt) || resolvedName || 'Avatar';

  return (
    <span
      className={cn(
        'ui-avatar',
        `ui-avatar--${size}`,
        `ui-avatar--${tone}`,
        stacked && 'ui-avatar--stacked',
        className
      )}
      {...props}
    >
      {normalizedSrc ? (
        <img src={normalizedSrc} alt={imageAlt} className="ui-avatar__image" onError={onImageError} />
      ) : (
        <span className="ui-avatar__initials">{resolvedInitials}</span>
      )}
    </span>
  );
};

export default Avatar;
