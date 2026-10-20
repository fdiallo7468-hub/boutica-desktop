/**
 * Electron Forge — Boutica Desktop
 * Fichier .cjs (le package est "type": "module") pour éviter toute ambiguïté de chargement.
 * Le main/preload sont bundlés par esbuild (dist-electron/) et le renderer par Vite (dist/renderer/) ;
 * seuls package.json, dist/ et dist-electron/ sont embarqués.
 *
 * Icône : aucune icône n'est fournie dans le dépôt. Pour en ajouter une, déposer build/icon.ico (Windows),
 * build/icon.icns (macOS) puis ajouter `icon: './build/icon'` dans packagerConfig.
 */
module.exports = {
  packagerConfig: {
    name: 'Boutica Desktop',
    executableName: 'boutica-desktop',
    appBundleId: 'com.fluo.boutica.desktop',
    appCategoryType: 'public.app-category.business',
    asar: true,
    ignore: (file) => {
      if (!file) return false;
      return !/^\/(package\.json|dist|dist-electron)(\/|$)/.test(file);
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'BouticaDesktop',
        authors: 'Fluo',
        description: 'Application desktop de gestion commerciale Boutica',
      },
    },
    { name: '@electron-forge/maker-zip', platforms: ['darwin', 'win32', 'linux'] },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Fluo Boutica Team',
          homepage: 'https://boutica-cloud.onrender.com',
        },
      },
    },
  ],
  plugins: [],
};
