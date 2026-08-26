import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lireAgents, lireStore, desaccords, ligneOtaAgents, blocOtaStore } from '../otaFiches';

// ── Les deux fiches racontent-elles la MÊME dernière OTA ? ───────────────────
//
// 🔴 CE QUE CE FICHIER FERME, écrit le 2026-08-26 après l'avoir payé une fois.
// `STORE-RELEASE.md` annonçait encore la 21ᵉ OTA quand la 22ᵉ était partie la
// veille : elle n'avait été consignée que dans la ligne « OTA publiées »
// d'`AGENTS.md`. Rien n'a rougi, parce que rien ne comptait — et c'est la fiche
// qu'on lit pour décider quoi soumettre à Apple qui décrivait un parc périmé.
//
// ⚠️ Ce test compare deux COPIES ; il ne dit pas si elles disent le VRAI. Deux
// fiches peuvent s'accorder et être fausses toutes les deux (personne ne
// documente l'OTA qu'on vient de publier). Cette moitié-là demande le réseau :
// `npm run check:ota`, qui interroge EAS. Les deux sont complémentaires, aucun
// ne remplace l'autre.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');

const AGENTS = lire('AGENTS.md');
const STORE = lire('STORE-RELEASE.md');

describe('les fiches d’OTA — les ancres, avant tout le reste', () => {
  // Sans ces deux cas, un simple changement de tournure ferait rendre `null` des
  // deux côtés et le test suivant passerait au vert EN NE MESURANT PLUS RIEN.
  it('la ligne « OTA publiées » existe dans AGENTS.md', () => {
    expect(ligneOtaAgents(AGENTS)).toBeTruthy();
  });

  it('la puce « **OTA** : » existe dans STORE-RELEASE.md', () => {
    expect(blocOtaStore(STORE)).toBeTruthy();
  });

  it('les trois champs se lisent dans les deux fiches', () => {
    expect(lireAgents(AGENTS)).not.toBeNull();
    expect(lireStore(STORE)).not.toBeNull();
  });
});

describe('les fiches d’OTA — elles disent la même chose', () => {
  it('même rang, même groupe, même commit', () => {
    // Le message d'échec NOMME l'écart : « rouge » sans le champ fautif enverrait
    // relire deux pavés de prose.
    expect(desaccords(lireAgents(AGENTS), lireStore(STORE))).toEqual([]);
  });

  it('le format des identifiants est plausible', () => {
    const a = lireAgents(AGENTS)!;
    expect(a.groupe).toMatch(/^[0-9a-f]{8}$/);
    expect(a.commit).toMatch(/^[0-9a-f]{7,40}$/);
    expect(a.numero).toBeGreaterThan(0);
  });
});

// ── La sonde sait-elle dire NON ? ────────────────────────────────────────────
//
// Un garde-fou qu'on n'a jamais vu rougir ne prouve rien. Ces cas le font rougir
// sur des textes FABRIQUÉS, donc sans toucher aux vraies fiches — et ils restent
// vrais le jour où les vraies fiches changent de contenu.

const faux = {
  agents: (n: number, g: string, c: string) =>
    `# Titre\n\n> Note ancienne citant un groupe \`87a65d34\` publié en 2026-08-21.\n\n` +
    `| Case | Valeur |\n|---|---|\n` +
    `| OTA publiées | **${n} — la ${n}ᵉ publiée le 2026-08-26** (groupe \`${g}\`, iOS + Android, runtime 1.0.0, commit **\`${c}\`** — reste de la prose. — **Historique** — 22ᵉ le 2026-08-25, groupe \`2b0a3053\`, commit **\`79c3638\`** — etc. |\n`,
  store: (n: number, g: string, c: string) =>
    `## Section\n\n- **OTA** : la dernière est la **${n}ᵉ** (groupe \`${g}\`, 2026-08-26, iOS + Android,\n` +
    `  runtime 1.0.0), publiée sur le commit \`${c}\` — suite de la puce.\n` +
    `  *(22ᵉ : \`2b0a3053\`, 2026-08-25, commit \`79c3638\`.)*\n\n**Paragraphe suivant.**\n`,
};

describe('les fiches d’OTA — la sonde prouvée dans les deux sens', () => {
  it('elle dit OUI : deux fiches accordées ne rendent aucun désaccord', () => {
    const a = lireAgents(faux.agents(23, '05baae2a', 'd71c3a2'));
    const s = lireStore(faux.store(23, '05baae2a', 'd71c3a2'));
    expect(desaccords(a, s)).toEqual([]);
  });

  it('elle dit NON sur le rang — le cas EXACT du 2026-08-25', () => {
    const a = lireAgents(faux.agents(23, '05baae2a', 'd71c3a2'));
    const s = lireStore(faux.store(21, '4d38f61c', '788ab09'));
    expect(desaccords(a, s)).toHaveLength(3);
    expect(desaccords(a, s)[0]).toContain('numero');
  });

  it('elle dit NON sur le seul groupe, les autres champs identiques', () => {
    const a = lireAgents(faux.agents(23, '05baae2a', 'd71c3a2'));
    const s = lireStore(faux.store(23, '2b0a3053', 'd71c3a2'));
    expect(desaccords(a, s)).toEqual([expect.stringContaining('groupe')]);
  });

  it('une fiche ILLISIBLE est un désaccord, jamais un accord', () => {
    expect(desaccords(lireAgents('rien du tout'), lireStore(faux.store(23, '05baae2a', 'd71c3a2')))).toHaveLength(1);
    expect(desaccords(null, null)).toHaveLength(1);
  });
});

describe('les fiches d’OTA — l’instrument ne se verrouille pas sur la mauvaise phrase', () => {
  it('un groupe cité PLUS HAUT dans AGENTS.md n’est pas pris pour le courant', () => {
    // Le faux fichier porte `87a65d34` avant la table, comme le vrai. Un ancrage
    // « premier groupe du fichier » rendrait ce hash-là et resterait vert à vie.
    expect(lireAgents(faux.agents(23, '05baae2a', 'd71c3a2'))!.groupe).toBe('05baae2a');
  });

  it('l’HISTORIQUE qui suit sur la même ligne n’écrase pas la valeur courante', () => {
    const a = lireAgents(faux.agents(23, '05baae2a', 'd71c3a2'))!;
    expect(a.groupe).not.toBe('2b0a3053');
    expect(a.commit).toBe('d71c3a2');
  });

  it('AGENTS.md écrit le rang deux fois — un désaccord entre les deux est un échec', () => {
    // « **23 — la 22ᵉ publiée** » : le total et l'ordinal ont divergé. Illisible
    // plutôt que « à moitié juste », sinon on choisirait un des deux au hasard.
    const bancal = faux.agents(23, '05baae2a', 'd71c3a2').replace('la 23ᵉ', 'la 22ᵉ');
    expect(lireAgents(bancal)).toBeNull();
  });
});
