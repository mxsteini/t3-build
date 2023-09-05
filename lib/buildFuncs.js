import * as Sass from 'sass'
import path from 'path'
import fs from 'fs'
import * as child from 'child_process'
import * as esbuild from 'esbuild'
import * as Fse from 'fs-extra'
import * as Posthtml from 'posthtml'
import PosthtmlScssToFile from './posthtml-scss-to-file.js'
import PosthtmlRemoveTags from './posthtml-remove-tags.js'
import PosthtmlStyleToFile from './posthtml-style-to-file.js'
import PosthtmlStripTags from './posthtml-strip-tags.js'
import * as PosthtmlModules from 'posthtml-modules'
import * as dotenv from 'dotenv'
import {pathToFileURL} from 'url'
import log from 'npmlog'
import Bs from 'browser-sync'

const fse = Fse.default


const execSync = child.execSync

dotenv.config({
    path: path.resolve('.env')
})

export default class BuildFuncs {

    sassConfig = {
        sourceMap: true,
        importers: [{
            findFileUrl: (url) => {
                if (url.startsWith('scss')) {
                    return (pathToFileURL(path.join(path.resolve(this.config.source), this.sassConfig.packageName, url)))
                }
                if (url.startsWith('./')) return null
                if (url.startsWith('../')) return null
                return (pathToFileURL(path.join(path.resolve('./node_modules'), url)))
            }
        }]
    }

    constructor(config, clean = false) {
        log.enableColor()
        this.config = config
        this.sass = Sass
        this.posthtml = Posthtml.default

        this.posthtmlRemoveTags = new PosthtmlRemoveTags()
        this.posthtmlScssToFile = new PosthtmlScssToFile()
        this.posthtmlStyleToFile = new PosthtmlStyleToFile()
        this.posthtmlStripTags = new PosthtmlStripTags()

        this.posthtmlModules = PosthtmlModules.default
        if (clean) {
            this.config.sourcePackages.forEach(packageName => {
                this.cleanupPackage(packageName)
                this.copyAssets(packageName)
            })
        }
    }

    createBrowsersync(options) {
        let browserSyncOptions = {}
        const notify = {
            styles: [
                'display: none; ',
                'padding: 0;',
                'position: fixed;',
                'z-index: 9999;',
                'left: 10px;',
                'top: 10px;',
                'letter-spacing: .5px;',
                'background: transparent;',
                'color: white;',
                'text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;',
                'font-weight: normal;'
            ]
        }
        if (options.standalone) {
            const useHttps = process.env.T3BUILD_BRWOSERSYNC_STANDALONE_SSL_KEY && process.env.T3BUILD_BRWOSERSYNC_STANDALONE_SSL_CERT
            const https = {
                key: process.env.T3BUILD_BRWOSERSYNC_STANDALONE_SSL_KEY,
                cert: process.env.T3BUILD_BRWOSERSYNC_STANDALONE_SSL_CERT
            }
            browserSyncOptions = {
                open: 'external',
                port: process.env.T3BUILD_BRWOSERSYNC_STANDALONE_PORT || 4000,
                host: process.env.T3BUILD_BRWOSERSYNC_STANDALONE_HOST || 'standalone.localhost',
                ui: false,
                https: useHttps && https,
                watch: true,
                server: {
                    baseDir: path.join(process.env.T3BUILD_BRWOSERSYNC_STANDALONE, '..'),
                    directory: true,
                    index: 'Standalone/index.html'
                },
                serveStaticOptions: {
                    extensions: ["html"]
                },
                notify: notify,
                files: [
                    path.resolve(path.join(process.env.T3BUILD_BRWOSERSYNC_STANDALONE), '*')
                ]
            }
        } else {
            const useHttps = process.env.T3BUILD_BRWOSERSYNC_TYPO3_SSL_KEY && process.env.T3BUILD_BRWOSERSYNC_TYPO3_SSL_CERT
            const https = {
                key: process.env.T3BUILD_BRWOSERSYNC_TYPO3_SSL_KEY,
                cert: process.env.T3BUILD_BRWOSERSYNC_TYPO3_SSL_CERT
            }
            browserSyncOptions = {
                open: false,
                port: process.env.T3BUILD_BRWOSERSYNC_TYPO3_PORT || 4000,
                host: process.env.T3BUILD_BRWOSERSYNC_TYPO3_HOST || 'typo3.localhost',
                proxy: process.env.T3BUILD_BRWOSERSYNC_PROXY,
                ui: false,
                https: useHttps && https,
                notify: notify,
                files: [
                    {
                        match: [
                            path.resolve('public/typo3temp/ReloadFrontend.now')
                        ],
                        fn: (event, file) => {
                            log.info('clearCache by Backend')
                            this.bs.reload()
                        }
                    },
                    {
                        match: [
                            path.join(this.config.getPackagesDir(), '*/Configuration/TypoScript/**/*.typoscript'),
                            path.join(this.config.getPackagesDir(), '*/Classes/**/*.php')
                        ],
                        fn: (event, file) => {
                            log.info('clearCache')
                            this.clearCache(0, 1)
                        }
                    },
                    {
                        match: [
                            path.join(this.config.getPackagesDir(), '*/Configuration/**/*.yaml'),
                            path.join(this.config.getPackagesDir(), '*/Configuration/**/*.php'),
                            path.join(this.config.getPackagesDir(), '*/Resources/Private/Language/**/*.xlf')
                        ],
                        fn: (event, file) => {
                            log.info('clearAllCache')
                            this.clearCache(1, 1)
                        }
                    }
                ]
            }
        }
        this.bs = new Bs.init(browserSyncOptions)
    }

    cleanupPackage(packageName) {
        fs.rmSync(path.join(this.config.getPackagesDir(), packageName, 'Resources'), {recursive: true, force: true})
    }

    copyAssets(packageName) {
        if (fs.existsSync(path.join(this.config.getSourceDir(), packageName, 'assets'))) {
            fse.copySync(
                path.join(this.config.getSourceDir(), packageName, 'assets'),
                path.join(this.config.getPackagesDir(), packageName, 'Resources')
            )
        }
        fs.mkdirSync(path.join(this.config.getPackagesDir(), packageName, 'Resources/Public', this.config.js), {
            recursive: true,
        })
        fs.mkdirSync(path.join(this.config.getPackagesDir(), packageName, 'Resources/Public', this.config.css), {
            recursive: true,
        })
    }

    jsProcessor(file, packageName, reload = false) {
        const sourceFile = path.resolve(path.join('src', packageName, 'js', file))
        esbuild.build({
            entryPoints: [sourceFile],
            bundle: true,
            sourcemap: (this.config.mode === 'watch'),
            platform: 'browser',
            external: ['require', 'fs', 'path'],
            format: 'iife',
            outdir: path.join(this.config.getPackagesDir(), packageName, 'Resources/Public', this.config.js),
        })
            .then(() => {
                if (reload) {
                    this.clearCache(0, reload)
                }
                return true
            })
            .catch((e) => {
                log.error('1679589839815', e)
                this.notifyBrowserSync('error in compiling javascript');
                return false
            })
    }

    sassProcessor(file, packageName, reload = undefined) {
        const sourceFile = path.join(this.config.getSourceDir(), packageName, 'scss', file)
        let filename = file.replace('.scss', '.css')
        filename = filename.replace('.sass', '.css')
        const destFile = path.join(this.config.getPackagesDir(), packageName, 'Resources/Public/', this.config.css, filename)
        try {
            const result = this.sass.compile(sourceFile, this.sassConfig)
            this.writeContentToFile(result.css, destFile)
            if (reload) {
                this.bs.reload()
            }
        } catch(e) {
            log.error('1679589839815', e)
            this.notifyBrowserSync('error in compiling sass');
            return false
        }
        return true
    }

    async postHtmlProcessor(_options = {}) {
        const options = {
            ...{
                file: '',
                packageName: '',
                reload: false,
                quiet: true,
                standalone: false
            },
            ..._options
        }

        try {
            const sourceFile = path.join(
                this.config.getSourceDir(),
                options.packageName,
                (options.standalone ? 'standalone' : 'html'),
                options.file)
            const destFile = path.join(
                this.config.getPackagesDir(),
                options.packageName,
                (options.standalone ? 'Resources/Public/Standalone' : 'Resources/Private'),
                options.file)
            const html = fs.readFileSync(sourceFile).toString('utf-8')
            const relativeFile = path.relative(
                path.join(
                    this.config.source,
                    options.packageName,
                    options.standalone ? 'standalone' : 'html'
                ),
                sourceFile
            )

            const localOptions = {
                importers: [{
                    findFileUrl(url) {
                        if (url.startsWith('scss')) {
                            return (pathToFileURL(path.join(path.resolve(this.config.source), options.packageName, url)))
                        }
                        if (url.startsWith('./')) return null
                        if (url.startsWith('../')) return null
                        return (pathToFileURL(path.join(path.resolve('./node_modules'), url)))
                    }
                }]
            }

            let result = ''

            if (options.standalone) {
                result = await this.posthtml()
                    .use(this.posthtmlModules({
                        from: path.resolve(path.join(this.config.source, options.packageName, '/') + '/'),
                        root: path.resolve(path.join(this.config.source, options.packageName, '/') + '/')
                    }))
                    .use(this.posthtmlRemoveTags.process({
                        tags: ['fluid']
                    }))
                    .use(this.posthtmlStripTags.process({
                        tags: ['standalone']
                    }))
                    .use(this.posthtmlScssToFile.process({
                        'standalone': true,
                        'packageName': options.packageName,
                        'sassConfig': this.sassConfig,
                        'sass': this.sass
                    }))
                    .use(this.posthtmlStyleToFile.process({
                        removeStyle: 'tag',
                        path: path.join(this.config.packages, options.packageName, '/Resources/Public', 'Standalone', options.file.replace('.html', '.css'))
                    }))
                    .use(this.posthtmlStripTags.process({
                        tags: ['html']
                    }))
                    .process(html, {
                        xmlMode: true
                    })
                    .then((result) =>  result.html)
                result = `<!DOCTYPE html>\n<html data-generator="t3-build">\n` + result + `\n</html>`

            } else {
                result = await this.posthtml()
                    .use(this.posthtmlModules({
                        from: path.resolve(path.join(this.config.source, options.packageName, '/')),
                        root: path.resolve(path.join(this.config.source, options.packageName, '/'))
                    }))
                    .use(this.posthtmlRemoveTags.process({
                        tags: ['standalone']
                    }))
                    .use(this.posthtmlStripTags.process({
                        tags: ['fluid']
                    }))
                    .use(this.posthtmlScssToFile.process({
                        'destPath': path.join(this.config.packages, options.packageName, '/Resources/Public', this.config.css),
                        'packageName': options.packageName,
                        'css': this.config.css,
                        'relativeFile': relativeFile,
                        'sassConfig': this.sassConfig,
                        'sass': this.sass
                    }))
                    .process(html, {
                        xmlMode: true, from: options.file
                    })
                    .then((result) =>  result.html)

            }

            this.writeContentToFile(result, destFile)

            if (options.reload) {
                this.clearCache(0, 1)
            }

            return true

        } catch (e) {
            log.error(path.resolve(path.join(this.config.source, options.packageName)))
            log.error('1683809030314', e)
            this.notifyBrowserSync('error in compiling html');
            return false
        }
    }

    notifyBrowserSync(message) {
      if (this.bs) {
          this.bs.notify(`<p style="padding: .4em .6em; margin: 0; border-radius: 8px; background-color: #840808; color:white">${message}</p>`, 3500);
      }
    }

    clearCache(all = false, reload = false) {
        const command = all ?
            process.env.T3BUILD_TYPO3_CLEARALLCACHECMD || 'ddev typo3cms cache:flush':
            process.env.T3BUILD_TYPO3_CLEARCACHECMD || 'ddev typo3cms cache:flush --group=pages'

        try {
            if (!this.config.standalone) {
                log.info('clear cache')
                execSync(command)
            }
            if (reload) {
                this.bs.reload()
            }
        } catch (e) {
            log.error('1683869760818', e)
            this.notifyBrowserSync('error while cacheclear');
        }
    }

    getPackageName(file) {
        return path.relative('./src', file).split('/')[0]
    }

    writeContentToFile(data, file) {
        if (!fs.existsSync(path.dirname(file))) {
            fs.mkdirSync(path.dirname(file), {
                recursive: true,
            })
        }
        fs.writeFileSync(path.resolve(file), data, 'utf-8', function (error) {
            if (error) throw error
        })
    }
}
