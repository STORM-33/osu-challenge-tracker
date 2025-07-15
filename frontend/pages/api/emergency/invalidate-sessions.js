export default function handler(req, res) {
  res.setHeader('Set-Cookie', [
    'osu_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure',
    'osu_auth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure',
    'osu_auth_state_backup=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure'
  ]);
  res.json({ message: 'All sessions invalidated' });
}