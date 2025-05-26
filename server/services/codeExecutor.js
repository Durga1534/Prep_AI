const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class CodeExecutor {
    constructor() {
        this.supportedLanguages = {
            javascript: {
                extension: 'js',
                command: 'node',
                timeout: 5000
            },
            python: {
                extension: 'py',
                command: 'python',
                timeout: 5000
            },
            java: {
                extension: 'java',
                command: 'java',
                timeout: 10000
            }
        };

        this.tempDir = path.join(process.cwd(), 'temp');
    }

    async initialize() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create temp directory:', error);
            throw new Error('Failed to initialize code executor');
        }
    }

    async runCode(code, language) {
        if (!this.supportedLanguages[language]) {
            throw new Error(`Unsupported language: ${language}`);
        }

        const config = this.supportedLanguages[language];
        const fileId = uuidv4();
        const fileName = `${fileId}.${config.extension}`;
        const filePath = path.join(this.tempDir, fileName);

        try {
            // Write code to temporary file
            await fs.writeFile(filePath, code);

            // Execute code
            const output = await this.executeFile(filePath, config);

            // Clean up
            await this.cleanup(filePath);

            return output;
        } catch (error) {
            // Ensure cleanup even if execution fails
            await this.cleanup(filePath);
            throw error;
        }
    }

    executeFile(filePath, config) {
        return new Promise((resolve, reject) => {
            const command = `${config.command} "${filePath}"`;

            const child = exec(command, {
                timeout: config.timeout,
                maxBuffer: 1024 * 1024 // 1MB output limit
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data;
            });

            child.stderr.on('data', (data) => {
                stderr += data;
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    reject(new Error(stderr.trim() || 'Execution failed'));
                }
            });

            child.on('error', (error) => {
                reject(error);
            });
        });
    }

    async cleanup(filePath) {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            console.error('Failed to cleanup file:', error);
        }
    }

    validateCode(code, language) {
        // Add security checks
        const forbidden = [
            'require(',
            'import ',
            'process',
            'child_process',
            'fs',
            'path',
            '__dirname',
            '__filename',
            'eval(',
            'Function(',
        ];

        const containsForbidden = forbidden.some(term =>
            code.toLowerCase().includes(term.toLowerCase())
        );

        if (containsForbidden) {
            throw new Error('Code contains forbidden operations');
        }

        return true;
    }
}

const executor = new CodeExecutor();

module.exports = {
    async runCode(code, language) {
        await executor.initialize();

        // Validate code before execution
        executor.validateCode(code, language);

        return await executor.runCode(code, language);
    }
};