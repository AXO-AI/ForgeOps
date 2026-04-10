# Understanding Security Results
5 scans run on every pipeline:
1. **SAST** (SonarQube) — source code bugs
2. **SCA** (OWASP/Black Duck) — dependency vulnerabilities
3. **Secrets** (Gitleaks) — leaked credentials
4. **Container** (Trivy) — image vulnerabilities
5. **SBOM** (Syft) — component inventory
Results: Dashboard → Security page, or pipeline run → Security Gate job.
