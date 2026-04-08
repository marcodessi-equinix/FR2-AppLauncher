const [major] = process.versions.node.split('.').map(Number);

if (Number.isNaN(major) || major < 22 || major >= 25) {
  console.error(
    [
      '',
      'AppLauncher requires Node.js >=22 <25.',
      `Current version: ${process.version}`,
      'Reason: the backend uses the built-in node:sqlite module, which is not available in Node 20.',
      'Please switch to Node 22 (for example via nvm) and run npm install again.',
      '',
    ].join('\n'),
  );

  process.exit(1);
}
