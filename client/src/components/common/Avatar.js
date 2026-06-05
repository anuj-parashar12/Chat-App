const SIZE_MAP = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

const COLORS = [
  'bg-purple-600', 'bg-blue-600', 'bg-green-600',
  'bg-orange-600', 'bg-pink-600', 'bg-teal-600',
];

const getColor = (name = '') => COLORS[name.charCodeAt(0) % COLORS.length];

export default function Avatar({ src, name = '', size = 'md' }) {
  return src ? (
    <img
      src={src}
      alt={name}
      className={`${SIZE_MAP[size]} rounded-full object-cover flex-shrink-0`}
    />
  ) : (
    <div className={`${SIZE_MAP[size]} ${getColor(name)} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}>
      {name.charAt(0).toUpperCase() || '?'}
    </div>
  );
}
