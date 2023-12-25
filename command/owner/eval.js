import { fileURLToPath } from "url"
import syntaxerror from "syntax-error"
import { createRequire } from "module"

export default {
    command: [">", "=>"],
    description: "Evaluasi atau memanggil sesuatu",
    example: "",
    name: "eval",
    tags: "owner",

    owner: true,

    run: async(m, { conn, args }) => {
        let __dirname = func.path.dirname(fileURLToPath(import.meta.url))
        let require = createRequire(__dirname)
        let _return = ""

        try {
            _return = /await/i.test(m.text) ? eval("(async() => { " + m.text + " })()") : eval(m.text)
        } catch (e) {
            _return = e
        }

        new Promise(async (resolve, reject) => {
            try {
                resolve(_return)
            } catch (err) {
                reject(err)
            }
        })?.then((res) => m.reply(func.format(res)))?.catch((err) => m.reply(func.format(err)))
    }
}