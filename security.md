# Security Policy

## 🔒 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## 🛡️ Security Measures

### Implemented Security Features

1. **Input Validation**
   - All API endpoints use `express-validator`
   - Strict type checking and sanitization
   - Maximum payload sizes enforced

2. **Rate Limiting**
   - General API: 100 requests per 15 minutes per IP
   - AI endpoints: 10 requests per minute per IP
   - Configurable thresholds

3. **Authentication & Authorization**
   - OAuth 2.0 for HeadHunter integration
   - CSRF protection with state parameter
   - Secure httpOnly cookies for tokens

4. **Headers & CSP**
   - Helmet.js for security headers
   - Content Security Policy configured
   - X-Frame-Options, X-Content-Type-Options enabled

5. **Data Protection**
   - No sensitive data in localStorage
   - API keys never exposed to frontend
   - HTTPS required in production

## 🚨 Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. **DO NOT** create a public GitHub issue

### 2. Email us at: **security@airesume.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 3. Response Timeline
- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Critical issues within 14 days

### 4. Responsible Disclosure
We request a 90-day disclosure timeline to:
- Verify and reproduce the issue
- Develop and test a fix
- Deploy the fix to production
- Notify affected users

## 🏆 Security Hall of Fame

We recognize security researchers who help us maintain a secure platform:

- *Your name could be here!*

## 🔐 Security Best Practices for Users

### For Developers Deploying This App

1. **Environment Variables**
   ```bash
   # Never commit .env files
   # Use environment-specific configs
   # Rotate API keys regularly
   ```

2. **HTTPS Enforcement**
   ```nginx
   # Always use HTTPS in production
   server {
       listen 443 ssl;
       # ... SSL configuration
   }
   ```

3. **Regular Updates**
   ```bash
   # Check for security updates weekly
   npm audit
   npm audit fix
   ```

4. **Monitoring**
   - Enable error tracking (Sentry)
   - Monitor rate limit violations
   - Track failed authentication attempts
   - Set up alerts for suspicious activity

### For End Users

1. **Password Security**
   - Use strong, unique passwords
   - Enable 2FA on connected services (HH)

2. **Data Privacy**
   - Review permissions before OAuth
   - Regularly check connected applications
   - Don't share OAuth tokens

3. **Phishing Prevention**
   - Verify URLs before entering credentials
   - Be cautious of suspicious emails
   - Report suspicious activity

## 📋 Security Checklist

Before deploying to production:

- [ ] All dependencies updated (`npm audit`)
- [ ] Environment variables secured
- [ ] HTTPS enabled and enforced
- [ ] CSP headers configured
- [ ] Rate limiting active
- [ ] Error tracking enabled (Sentry)
- [ ] Backup strategy implemented
- [ ] Monitoring alerts configured
- [ ] Security headers tested (securityheaders.com)
- [ ] OWASP Top 10 reviewed

## 🔍 Known Issues

None currently. Check [GitHub Security Advisories](https://github.com/your-username/ai-resume-builder/security/advisories) for updates.

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)

## 📞 Contact

- **Security Email**: security@airesume.com
- **PGP Key**: [Download](https://your-domain.com/pgp-key.asc)
- **Bug Bounty**: Not currently available

---

**Last Updated**: 2025-01-20

Thank you for helping keep AI Resume Builder secure! 🙏
