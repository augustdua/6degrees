import { fetchOpenGraph } from '@/utils/openGraph';

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: tsx src/scripts/testOpenGraph.ts <url>');
    process.exit(1);
  }

  const result = await fetchOpenGraph(url, { timeoutMs: 9000, maxBytes: 2_000_000 });
  // Pretty print for quick local testing
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


