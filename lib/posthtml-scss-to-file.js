import fs from 'fs'
import path from 'path'


export default class posthtmlStyleToFile {
    process(options) {
        return function (tree) {
            const destPath = options.destPath
            const packageName = options.packageName
            const relativeFile = options.relativeFile.replace('.html', '')
            const sections = []

            tree.match({tag: 'style', attrs: {type: 'text/scss'}}, function (node) {
                const css = node.content[0].trim() || ''

                options.sassConfig.packageName = packageName
                const result = options.sass.compileString(css, options.sassConfig)

                const section = node.attrs.section || ''
                const destFile = relativeFile + section

                sections.push({
                    name: node.attrs.section || 'html',
                    destFile: destFile
                })

                const file = path.join(destPath, destFile) + '.css'
                if (!fs.existsSync(path.dirname(file))) {
                    fs.mkdirSync(path.dirname(file), {
                        recursive: true,
                    })
                }
                fs.writeFileSync(path.resolve(file), result.css.toString(), 'utf-8', function (error) {
                    if (error) throw error
                })
                return ''
            })

            for (const [, section] of Object.entries(sections)) {
                const asset = {
                    tag: 'f:asset.css',
                    attrs: {
                        identifier: packageName + '/' + section.destFile,
                        href: 'EXT:' + packageName + '/Resources/Public/' + options.css + '/' + section.destFile + '.css'
                    }
                }

                if (section.name === 'html') {
                    tree.match({tag: 'html'}, function (node) {
                        node.content.unshift(asset)
                        node.content.unshift('\n')
                        return node
                    })
                } else {
                    tree.match({tag: 'f:section', attrs: {name: section.name}}, function (node) {
                        node.content.unshift(asset)
                        node.content.unshift('\n')
                        return node
                    })
                }
            }

            return tree
        }
    }
}
