const sheetURL = "https://opensheet.elk.sh/1gU34_gLsxTHDy_nxhtg91-Ld6VaU4Zba65dBkZD-2aQ/Página1";

fetch(sheetURL)
  .then(response => response.json())
  .then(data => {
    console.log("✅ Dados carregados da planilha:", data);
  })
  .catch(error => console.error("Erro ao carregar planilha:", error));
