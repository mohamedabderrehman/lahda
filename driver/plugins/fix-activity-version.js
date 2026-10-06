// Expo SDK 54 exposes config-plugin helpers through its public package.
// Importing the transitive package directly is incompatible with pnpm.
const { withProjectBuildGradle } = require('expo/config-plugins');

function fixActivityVersion(config) {
  return withProjectBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (!contents.includes("force 'androidx.activity")) {
      const insertion = `
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.activity:activity:1.9.3'
            force 'androidx.activity:activity-ktx:1.9.3'
            force 'androidx.activity:activity-compose:1.9.3'
        }
    }
}
`;
      contents += insertion;
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = fixActivityVersion;
