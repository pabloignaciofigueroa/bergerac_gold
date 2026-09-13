import {copyFile} from 'node:fs/promises';
// Keep the previously used address working with the new modular site.
await copyFile('index.html','bergerac.html');
