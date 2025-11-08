# Contributing to Panda Pathways

Thank you for your interest in contributing to Panda Pathways! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear title and description
- Steps to reproduce the bug
- Expected vs actual behavior
- Screenshots (if applicable)
- Your environment (browser, OS, wallet)

### Suggesting Features

We love new ideas! Please open an issue with:
- A clear description of the feature
- Why it would be useful
- How it might work
- Any potential drawbacks

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/panda-pathways.git
   cd panda-pathways
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Write clear, commented code
   - Follow existing code style
   - Add tests if applicable
   - Update documentation

4. **Test your changes**
   ```bash
   npm run build
   npm run lint
   ```

5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```

   Use conventional commits:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `style:` for formatting
   - `refactor:` for refactoring
   - `test:` for tests
   - `chore:` for maintenance

6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**
   - Describe your changes
   - Reference any related issues
   - Wait for review

## Development Setup

See [README.md](README.md#installation) for setup instructions.

## Code Style

- Use TypeScript for all new code
- Follow React best practices
- Use functional components with hooks
- Comment complex logic
- Keep functions small and focused

## Smart Contract Guidelines

- Write tests for all contract functions
- Document all public functions
- Handle errors gracefully
- Optimize for gas efficiency
- Follow Rust best practices

## Testing

- Test on testnet before submitting
- Verify wallet integration works
- Check all transaction flows
- Test edge cases

## Questions?

Feel free to open an issue or reach out to the maintainers.

## Code of Conduct

Be respectful and inclusive. We're all here to build cool stuff together!

---

**Thank you for contributing! 🐼**
