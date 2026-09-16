// Compatibility entrypoint for the current HTTP/browser integration suite.
import('../../scripts/browser-test.mjs').catch(error=>{console.error(error);process.exitCode=1;});
