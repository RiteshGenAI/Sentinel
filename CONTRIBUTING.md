# Contributing to Sentinel

Thank you for your interest in contributing to the Sentinel project! We appreciate your help in making this project better.

Please review the following guidelines before you get started.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct (please respect others, communicate constructively, and cooperate in good faith).

## How Can I Contribute?

### Reporting Bugs
- Search existing issues to see if the bug has already been reported.
- If it hasn't, open a new issue with a clear title and description, including:
  - Steps to reproduce.
  - Expected vs. actual behavior.
  - Screenshots or logs if applicable.
  - Environment details (OS, Node.js version, Python version, browser, etc.).

### Suggesting Enhancements
- Search existing issues/discussions to see if the feature has already been requested.
- Open a new issue describing the feature, why it is useful, and how it might work.

### Submitting Pull Requests
1. **Fork the Repository** and create your branch from `main` (e.g., `git checkout -b feature/your-feature-name`).
2. **Make your changes** following the coding standards of the project:
   - For backend changes, ensure code adheres to clean Python practices.
   - For frontend changes, write clean TypeScript and React components.
3. **Write tests** for your new code if applicable.
4. **Run existing tests** to verify that nothing is broken.
5. **Commit your changes** with descriptive commit messages (following [Conventional Commits](https://www.conventionalcommits.org/) is recommended).
6. **Push to your fork** and submit a pull request (PR).
7. Ensure your PR description clearly explains what you did and links to any related issues.

---

## Development Setup

### Backend (Python)
The backend is located in the `/backend` directory.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Unix/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run migrations/seed data if required:
   ```bash
   python migrate.py
   python seed_demo_data.py
   ```

### Frontend (React + TypeScript + Vite)
The frontend is located in the `/frontend` directory.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Full-Stack Docker Setup
Alternatively, you can run the entire environment (including Postgres database) using Docker Compose:
```bash
docker-compose up --build
```
