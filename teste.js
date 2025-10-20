const SHEET_ID = "1gU34_gLsxTHDy_nxhtg91-Ld6VaU4Zba65dBkZD-2aQ";
const GID = 0; 
const WHATSAPP_NUMBER = "5543999705837";

async function fetchSheetJson(sheetId, gid = 0) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  const res = await fetch(url);
  const txt = await res.text();
  // resposta vem como:  /*O_o*/\ngoogle.visualization.Query.setResponse(<JSON>);
  const start = txt.indexOf('(');
  const end = txt.lastIndexOf(')');
  const jsonStr = txt.substring(start + 1, end);
  return JSON.parse(jsonStr);
}
console.log(fetchSheetJson(SHEET_ID, GID));