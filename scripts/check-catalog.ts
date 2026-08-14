/**
 * Script de verificação manual: bate direto na Store API real da Modumacc
 * e imprime um resumo do catálogo da linha Cozinha, usando o MESMO código
 * de produção (src/api/storeApi.ts) — útil pra validar rapidamente se algo
 * mudou no catálogo do cliente (nome de atributo, categoria, etc.) sem
 * precisar abrir o app inteiro.
 *
 * Rodar com: npm run check:catalog
 */
import { fetchKitchenModules, resolveVariation } from '../src/api/storeApi';

async function main() {
  const catalog = await fetchKitchenModules();
  console.log(`Módulos carregados da linha Cozinha: ${catalog.length}\n`);

  for (const m of catalog) {
    console.log(
      `- ${m.name} | larguras=[${m.availableWidths.join(',')}]cm | ` +
        `acabamentos=${m.availableFinishes.length} | puxador=${m.hasHandle} | ` +
        `variações=${m.variations.length} | R$${(m.minPriceCents / 100).toFixed(2)}` +
        (m.maxPriceCents !== m.minPriceCents ? `-${(m.maxPriceCents / 100).toFixed(2)}` : ''),
    );
  }

  const sample = catalog.find((m) => m.variations.length > 0);
  if (sample) {
    const resolved = await resolveVariation(sample.variations[0].variationId);
    console.log('\n=== Exemplo de resolução de variação (preço + add-to-cart URL) ===');
    console.log(resolved);
  }
}

main().catch((err) => {
  console.error('Falha ao consultar a Store API:', err);
  process.exit(1);
});
