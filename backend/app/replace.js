const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace Playlist -> ClipGroup
    content = content.replace(/Playlist/g, 'ClipGroup');
    // Replace playlist -> clipGroup
    content = content.replace(/playlist/g, 'clipGroup');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Processed', filePath);
}

const dir = process.argv[2];

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.java')) {
            replaceInFile(fullPath);
        }
    });
}

walk(dir);
