# 6Degrees Versioning Strategy

## Current Version: 0.1.0-beta

### Version Format: `MAJOR.MINOR.PATCH[-PRERELEASE]`

- **MAJOR**: Breaking changes, major feature additions
- **MINOR**: New features, significant improvements (backward compatible)
- **PATCH**: Bug fixes, small improvements
- **PRERELEASE**: `-beta`, `-alpha`, `-rc` (release candidate)

### Release Stages

#### 1. Alpha (0.0.x-alpha)
- Internal testing only
- Major features in development
- Frequent breaking changes
- Not user-facing

#### 2. Beta (0.x.x-beta) ← **CURRENT STAGE**
- Public testing
- Core features complete
- Bug fixes and polish
- Virtual currency only
- User feedback collection

#### 3. Release Candidate (x.x.x-rc)
- Feature complete
- Final testing before stable release
- No new features, only bug fixes

#### 4. Stable (x.x.x)
- Production ready
- Real currency enabled
- Full feature set
- Long-term support

### Version History

- `0.1.0-beta` - Initial beta release with core networking features
  - User authentication
  - Connection requests
  - Messaging system
  - Virtual rewards
  - Discovery system

### Next Versions

- `0.2.0-beta` - Enhanced features
  - Real-time notifications
  - Advanced search/filtering
  - Profile improvements
  - Mobile optimization

- `0.3.0-beta` - Monetization features
  - Payment integration testing
  - Real currency transactions
  - Advanced analytics

- `1.0.0` - Stable release
  - Production ready
  - Full feature set
  - Real money transactions

### Version Update Process

1. **Development**: Work on features in `dev` branch
2. **Testing**: Merge to `beta` branch for testing
3. **Release**: Tag version and deploy
4. **Documentation**: Update changelog and version notes

### User Communication

- **Beta Banner**: Shows on page refresh
- **Version Display**: Visible in app footer/header
- **Changelog**: Available in Help section
- **Notifications**: Important updates via in-app notifications
