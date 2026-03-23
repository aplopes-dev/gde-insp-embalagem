import { OpJerpDto, PackagingJerpDto } from "@/types/dtos/op-jerp-dto";

const BLISTER_TERMS = ["blister", "cartela"];
const BOX_TERMS = ["caixa", "box"];
const IGNORED_TOKENS = new Set([
  ...BLISTER_TERMS,
  ...BOX_TERMS,
  "embalagem",
  "etiqueta",
  "triplex",
  "antiestatico",
  "antistatico",
]);

export type SelectedOpPackagings = {
  blisterPackagings: PackagingJerpDto[];
  blisterPackaging?: PackagingJerpDto;
  boxPackaging?: PackagingJerpDto;
  preferredBlisterPackagingId?: number;
};

export function isBlisterPackaging(packaging: PackagingJerpDto) {
  const normalizedName = normalizeText(packaging.nome);
  return BLISTER_TERMS.some((term) => normalizedName.includes(term));
}

export function isBoxPackaging(packaging: PackagingJerpDto) {
  const normalizedName = normalizeText(packaging.nome);
  return BOX_TERMS.some((term) => normalizedName.includes(term));
}

export function selectOpPackagings(externalOp: OpJerpDto): SelectedOpPackagings {
  const blisterPackagings = externalOp.embalagens.filter(isBlisterPackaging);
  const boxPackaging = externalOp.embalagens.find(isBoxPackaging);

  if (blisterPackagings.length <= 1) {
    return {
      blisterPackagings,
      blisterPackaging: blisterPackagings[0],
      boxPackaging,
      preferredBlisterPackagingId: blisterPackagings[0]?.id,
    };
  }

  const scoredPackagings = blisterPackagings
    .map((packaging) => ({
      packaging,
      score: scoreBlisterPackaging(packaging, externalOp.produto.nome),
    }))
    .sort((left, right) => right.score - left.score);

  const preferredPackaging = scoredPackagings[0];
  const hasConfidentMatch = Boolean(preferredPackaging && preferredPackaging.score > 0);

  return {
    blisterPackagings,
    blisterPackaging: hasConfidentMatch
      ? preferredPackaging.packaging
      : blisterPackagings[0],
    boxPackaging,
    preferredBlisterPackagingId: hasConfidentMatch
      ? preferredPackaging.packaging.id
      : undefined,
  };
}

function scoreBlisterPackaging(packaging: PackagingJerpDto, productName: string) {
  const productKey = compactComparableText(productName);
  const packagingKey = compactComparableText(packaging.nome);

  const productTokens = extractComparableTokens(productName);
  const packagingTokens = extractComparableTokens(packaging.nome);
  const overlap = productTokens.filter((token) => packagingTokens.includes(token)).length;

  let score = overlap * 10;

  if (productKey && packagingKey) {
    if (packagingKey.includes(productKey) || productKey.includes(packagingKey)) {
      score += 100;
    }
  }

  if (normalizeText(packaging.nome).includes("tampa")) {
    score -= 20;
  }

  return score;
}

function compactComparableText(value: string) {
  return extractComparableTokens(value).join("");
}

function extractComparableTokens(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !IGNORED_TOKENS.has(token));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}