import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

async function findNonUnoClasses() {
  try {
    const buildDir = path.resolve(process.cwd(), 'build');

    // Find all HTML and JS files in build directory
    const files = await glob(path.join(buildDir, '**', '*.{html,js}').replace(/\\/g, '/'));

    const allClasses = new Set();
    const nonUnoClasses = new Set();

    // Regex to match class attributes
    const classRegex = /class[=:]["']([^"']+)["']/gi;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = path.relative(buildDir, file);

      let match;
      while ((match = classRegex.exec(content)) !== null) {
        const classValue = match[1];

        // Split by whitespace to get individual classes
        const classes = classValue.split(/\s+/).filter(Boolean);

        for (const className of classes) {
          allClasses.add(className);

          if (
            !className.startsWith('_') &&
            !className.startsWith('svelte-') &&
            className !== 'group'
          ) {
            nonUnoClasses.add(className);
            console.log(`Found non-Uno class "${className}" in ${relativePath}`);
          }
        }
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total unique classes found: ${allClasses.size}`);
    console.log(`Uno classes: ${allClasses.size - nonUnoClasses.size}`);
    console.log(`Non-uno classes: ${nonUnoClasses.size}`);

    if (nonUnoClasses.size > 0) {
      console.log('\n=== All non-uno classes ===');
      const sortedClasses = Array.from(nonUnoClasses).sort();
      sortedClasses.forEach((className) => {
        console.log(`  ${className}`);
      });
    }
  } catch (error) {
    console.error('Error finding classes:', error);
    process.exit(1);
  }
}

// Run the script
findNonUnoClasses();
