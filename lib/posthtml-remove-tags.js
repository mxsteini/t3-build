export default class posthtmlRemoveTags {
    process(options) {
        return function (tree) {
            tree.match(options.tags.map(tag => ({tag: tag})), node => {
                node.tag = false;
                node.content = [];
                return node;
            })
            return tree
        }
    }
}
