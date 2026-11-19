const base = "http://localhost:3000";
const html = await (await fetch(base + "/")).text();
const re = new RegExp("/_next/static/chunks/[^\"'\\\\]+?\\.js", "g");
const urls = [...html.matchAll(re)].map((m) => m[0]);
console.log("chunk scripts referenced:", urls.length);
let old = 0,
  neu = 0,
  checked = 0;
for (const u of urls) {
  const js = await (await fetch(base + u)).text();
  checked++;
  const hasOld = js.includes("pb-16 pt-32") || js.includes("gap-14 px-4 pb-16");
  const hasNew = js.includes("pt-24 sm:pt-28") || js.includes("gap-12 px-4 pb-14");
  if (hasOld) {
    old++;
    console.log("OLD hero code in:", u.slice(0, 70));
  }
  if (hasNew) {
    neu++;
    console.log("NEW hero code in:", u.slice(0, 70));
  }
}
console.log({ checked, withOldHero: old, withNewHero: neu });
