const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { rimraf } = require('rimraf');

exports.default = async function(context) {
    const { appOutDir, electronPlatformName } = context;
    
    console.log('Creating Python environment for:', electronPlatformName);
    
    try {
        const resourcesDir = path.join(appOutDir, electronPlatformName === 'darwin' ? 'MLS.app/Contents/Resources' : 'resources');
        const venvPath = path.join(resourcesDir, '.venv');
        const backendPath = path.join(resourcesDir, 'backend');

        // Clean up the entire resources directory first
        console.log('Cleaning up resources directory...');
        if (fs.existsSync(resourcesDir)) {
            await rimraf(resourcesDir);
        }
        fs.mkdirSync(resourcesDir, { recursive: true });

        // Copy backend files
        console.log('Copying backend files...');
        execSync(`cp -R "${path.join(__dirname, '..', '..', 'backend')}" "${backendPath}"`, {
            stdio: 'inherit'
        });

        // Create new virtual environment without symlinks
        console.log('Creating virtual environment at:', venvPath);
        execSync(`python3 -m venv "${venvPath}" --copies --clear`, {
            stdio: 'inherit',
            env: {
                ...process.env,
                PYTHONPATH: '',
                PYTHONHOME: ''
            }
        });

        // Install requirements using absolute path to pip
        console.log('Installing requirements...');
        const pipPath = path.join(venvPath, 'bin', 'pip3');
        
        // Upgrade pip first
        execSync(`"${pipPath}" install --upgrade pip --no-cache-dir`, {
            stdio: 'inherit',
            env: {
                ...process.env,
                PYTHONPATH: '',
                PYTHONHOME: ''
            }
        });

        // Install requirements
        execSync(`"${pipPath}" install -r "${path.join(backendPath, 'requirements.txt')}" --no-cache-dir`, {
            stdio: 'inherit',
            env: {
                ...process.env,
                PYTHONPATH: '',
                PYTHONHOME: ''
            }
        });

        console.log('Python environment setup completed successfully');
        return true;
    } catch (error) {
        console.error('Error setting up Python environment:', error);
        throw error;
    }
}; 