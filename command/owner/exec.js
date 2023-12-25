import { promisify } from "util";
import cp, { exec as _exec } from "child_process";

export default {
  command: ["$"],
  description: "Eksekusi sesuatu",
  example: "",
  name: "exec",
  tags: "owner",

  owner: true,

  run: async (m, { conn, text }) => {
    let exec = promisify(_exec).bind(cp),
      o;

    try {
      o = await exec(text);
    } catch (e) {
      o = e;
    } finally {
      let { stdout, stderr } = o;

      if (stdout.trim()) m.reply(stdout);
      if (stderr.trim()) m.reply(stderr);
    }
  },
};
