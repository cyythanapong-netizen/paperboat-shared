// One package manager panel for every Squero/Paperboat app: a runtime (juliaup, paperboat,
// OpenModelica), its environment's installed packages, and a registry to add from. The app
// supplies the data and the actions; the panel only lays them out.
export { PackagePanel } from "./PackagePanel.tsx";
export type { InstalledPackage, PackageAction, PackageEnvironment, PackagePanelProps, PackageRegistry, PackageRuntime, RegistryDetail, RegistryItem, RuntimeChannel } from "./PackagePanel.tsx";
