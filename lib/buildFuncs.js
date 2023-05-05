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
import * as PosthtmlInclude from 'posthtml-include'
import * as dotenv from 'dotenv'
import {pathToFileURL} from 'url'
import log from 'npmlog'
import Bs from 'browser-sync'

const fse = Fse.default


const exec = child.exec

dotenv.config({
    path: path.resolve('.env')
})

const clearCacheCmd = process.env.T3BUILD_TYPO3_CLEARCACHECMD || 'vendor/bin/typo3cms cache:flush --group=pages'
const clearAllCacheCmd = process.env.T3BUILD_TYPO3_CLEARALLCACHECMD || 'vendor/bin/typo3cms cache:flush'

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
        this.sass = Sass.default
        this.posthtml = Posthtml.default

        this.posthtmlRemoveTags = new PosthtmlRemoveTags()
        this.posthtmlScssToFile = new PosthtmlScssToFile()
        this.posthtmlStyleToFile = new PosthtmlStyleToFile()
        this.posthtmlStripTags = new PosthtmlStripTags()

        this.posthtmlInclude = PosthtmlInclude.default
        if (clean) {
            this.config.sourcePackages.forEach(packageName => {
                this.cleanupPackage(packageName)
                this.copyAssets(packageName)
            })
        }
        // if (this.config.mode === 'watch') {
        //     this.createBrowsersync()
        // }

        // dotenv.config({
        //     path: path.join(this.projectPath, '.env')
        // })
        // this.clearCacheCmd = process.env.TYPO3_CLEARCACHECMD || 'vendor/bin/typo3cms cache:flush --group=pages'
    }

    createBrowsersync() {


        this.bs = new Bs.init({
            open: process.env.T3BUILD_BRWOSERSYNC_OPEN || true,
            port: process.env.T3BUILD_BRWOSERSYNC_PORT,
            proxy: process.env.T3BUILD_BRWOSERSYNC_PROXY,
            host: process.env.T3BUILD_BRWOSERSYNC_HOST,
            https: {
                key: process.env.T3BUILD_BRWOSERSYNC_SSL_KEY,
                cert: process.env.T3BUILD_BRWOSERSYNC_SSL_CERT
            },
            notify: false,
            files: [
                {
                    match: [
                        path.join('public/typo3temp/ReloadFrontend.now')
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
                        exec(clearCacheCmd, () => {
                            this.bs.reload()
                        })
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
                        exec(clearAllCacheCmd, () => {
                            this.bs.reload()
                        })
                    }
                }
            ]
        })
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
            .catch((e) => log.error('1679589839815', e))
            .then(() => {
                if (reload) {
                    exec(clearCacheCmd, () => {
                        this.bs.reload()
                    })
                }
            })
    }

    sassProcessor(file, packageName, reload = undefined) {
        const sourceFile = path.join(this.config.getSourceDir(), packageName, 'scss', file)
        const destFile = path.join(this.config.getPackagesDir(), packageName, 'Resources/Public/', this.config.css, file.replace('scss', 'css'))
        const result = this.sass.compile(sourceFile, this.sassConfig)
        this.writeContentToFile(result.css, destFile)
        if (reload) {
            this.bs.reload()
        }
    }

    postHtmlProcessor(_options = {}) {
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
                result = this.posthtml()
                    .use(this.posthtmlInclude({root: path.join(this.config.source, options.packageName, 'html-modules')}))
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
                    .use(this.posthtmlRemoveTags.process({
                        tags: ['fluid']
                    }))
                    .use(this.posthtmlStripTags.process({
                        tags: ['standalone', 'html']
                    }))
                    .process(html, {
                        xmlMode: true, sync: true
                    }).html
                result = `<html>\n` + result + `\n</html>`

            } else {
                result = this.posthtml()
                    .use(this.posthtmlInclude({root: path.join(this.config.source, options.packageName, 'html-modules')}))
                    .use(this.posthtmlScssToFile.process({
                        'destPath': path.join(this.config.packages, options.packageName, '/Resources/Public', this.config.css),
                        'packageName': options.packageName,
                        'css': this.config.css,
                        'relativeFile': relativeFile,
                        'sassConfig': this.sassConfig,
                        'sass': this.sass
                    }))
                    .use(this.posthtmlRemoveTags.process({
                        tags: ['standalone']
                    }))
                    .use(this.posthtmlStripTags.process({
                        tags: ['fluid']
                    }))
                    .process(html, {
                        xmlMode: true, sync: true, from: options.file
                    }).html
            }

            this.writeContentToFile(result, destFile)

            if (options.reload) {
                exec(clearCacheCmd, () => {
                    this.bs.reload()
                })
            }

        } catch (e) {
            console.log(e)
        }
        return
    }

    clearCache(all = false, reload = false) {
        const command = all ?
            process.env.T3BUILD_TYPO3_CLEARCACHECMD || 'ddev typo3cms cache:flush --group=pages' :
            process.env.T3BUILD_TYPO3_CLEARALLCACHECMD || 'ddev typo3cms cache:flush'


        exec(command, () => {
            if (reload) {
                this.bs.reload()
            }
        })
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
