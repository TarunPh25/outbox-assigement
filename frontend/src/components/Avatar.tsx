import type { User } from '../types';

export default function Avatar({ user, size = 32 }: { user: User; size?: number }) {
  const style = { width: size, height: size };
  if (user.avatar) {
    return <img src={user.avatar} alt="" referrerPolicy="no-referrer" style={style} className="shrink-0 rounded-full object-cover ring-2 ring-brand/20" />;
  }
  return (
    <span
      style={{
        ...style,
        background: 'linear-gradient(135deg, #22d3a5, #16b38a)',
        fontSize: Math.round(size * 0.38),
      }}
      className="grid shrink-0 place-items-center rounded-full font-bold text-night-900 ring-2 ring-brand/30"
    >
      {user.name[0].toUpperCase()}
    </span>
  );
}
