import fs from 'fs'
import path from 'path'


export default class posthtmlStyleToFile {
    process(options) {
        return function (tree) {
            const packageName = options.packageName
            options.sassConfig.packageName = packageName

            if (options.standalone) {
                tree.match({tag: 'style', attrs: {type: 'text/scss'}}, function (node) {

                    const css = node.content[0].trim() || ''
                    let result = ''
                    try {
                        result = options.sass.compileString(css, options.sassConfig)
                    } catch (e) {
                        console.log('error')
                        console.log(options.sassConfig)
                        console.log(e)
                    }
                    node.attrs.type = 'text/css'
                    node.content[0] = result.css
                    return node
                })
            } else {
                const destPath = options.destPath
                const relativeFile = options.relativeFile.replace('.html', '')
                const sections = []

                tree.match({tag: 'style', attrs: {type: 'text/scss'}}, function (node) {
                    const css = node.content[0].trim() || ''

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
            }
            return tree
        }
    }
}
