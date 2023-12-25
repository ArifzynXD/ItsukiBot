export default {
    //kosongin aja kalo mau di matiin
    command: [""],
    description: "",
    example: "", //%p = prefix, %cmd = command, %text = teks
    name: "",
    tags: "",

    //atur ke true jika ingin menyalakan
    admin: false,
    botAdmin: false,
    group: false,
    limit: false,
    loading: false,
    owner: false,
    premium: false,
    private: false,
    quoted: false,
    register: false,
    media: {
        audio: false,
        image: false,
        sticker: false,
        video: false
    },

    run: async(m, { conn, text, args, command, isPrem }) => {
        //your script code
    }
}
