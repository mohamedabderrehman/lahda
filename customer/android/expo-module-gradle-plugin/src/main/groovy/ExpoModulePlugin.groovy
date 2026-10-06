import org.gradle.api.Plugin
import org.gradle.api.Project

class ExpoModulePlugin implements Plugin<Project> {
  void apply(Project project) {
    def rootDir = project.rootProject.rootDir
    def parent = rootDir.parentFile
    def scriptFile = new File(parent, "node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle")
    if (!scriptFile.exists()) {
      scriptFile = new File(rootDir, "node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle")
    }
    project.apply from: scriptFile.absolutePath
    // Apply Kotlin plugin first so project.ext.safeExtGet is set (used by useDefaultAndroidSdkVersions)
    project.applyKotlinExpoModulesCorePlugin()
    project.useDefaultAndroidSdkVersions()
    project.useExpoPublishing()
    project.useCoreDependencies()
  }
}
