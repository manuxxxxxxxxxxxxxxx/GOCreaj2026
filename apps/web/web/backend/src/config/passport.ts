import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { query } from './database';

/* ── JWT ── */
passport.use(new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET!,
  },
  async (payload, done) => {
    try {
      const { rows } = await query(
        'SELECT id, email, role, status FROM users WHERE id = $1 AND status != $2',
        [payload.userId, 'banned'],
      );
      const user = rows[0];
      if (!user) return done(null, false);
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  },
));

/* ── Google OAuth 2.0 ── */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL!,
    },
    async (_access, _refresh, profile, done) => {
      try {
        const email    = profile.emails?.[0]?.value;
        const googleId = profile.id;
        const name     = profile.displayName;
        const avatar   = profile.photos?.[0]?.value;

        if (!email) return done(new Error('Google no proporcionó email'), false);

        const { rows } = await query(
          'SELECT * FROM users WHERE google_id = $1 OR email = $2',
          [googleId, email],
        );
        let user = rows[0];

        if (user) {
          if (!user.google_id) {
            await query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
          }
          await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
        } else {
          const ins = await query(
            `INSERT INTO users (email, google_id, status, role, email_verified)
             VALUES ($1, $2, 'verified', 'buyer', true) RETURNING *`,
            [email, googleId],
          );
          user = ins.rows[0];
          await query(
            'INSERT INTO profiles (user_id, full_name, avatar_url) VALUES ($1, $2, $3)',
            [user.id, name, avatar],
          );
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, false);
      }
    },
  ));
}

export default passport;
