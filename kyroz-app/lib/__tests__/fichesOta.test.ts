import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lireAgents, lireStore, desaccords, ligneOtaAgents, blocOtaStore, chaineOta, chaineDivergente, publicationEnTete, verdictDateLegale } from '../otaFiches';

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

// ── L'HISTORIQUE aussi, pas seulement la tête ────────────────────────────────
//
// 🔴 Objection du fondateur, le jour même : « fais en sorte que les deux soient
// cohérentes ». Comparer la dernière OTA ne suffit pas — les deux fiches portent
// un HISTORIQUE, et il peut diverger SOUS la tête sans que rien ne le dise.
// `STORE-RELEASE.md` remonte moins loin (4 OTA contre 20) et c'est légitime :
// l'une décide d'une soumission, l'autre tient le journal. L'invariant est donc
// le PRÉFIXE, pas l'égalité.

const chaines = () => [chaineOta(ligneOtaAgents(AGENTS)!), chaineOta(blocOtaStore(STORE)!)] as const;

describe('les fiches d’OTA — l’historique commun ne diverge pas', () => {
  it('la chaîne de STORE-RELEASE.md est un préfixe de celle d’AGENTS.md', () => {
    const [longue, courte] = chaines();
    expect(chaineDivergente(longue, courte)).toEqual([]);
  });

  it('les deux fiches citent réellement plusieurs OTA — sinon on ne compare rien', () => {
    const [longue, courte] = chaines();
    expect(courte.groupes.length).toBeGreaterThan(1);
    expect(longue.groupes.length).toBeGreaterThanOrEqual(courte.groupes.length);
  });

  it('elle dit NON quand la divergence est SOUS la tête, pas dessus', () => {
    // Tête identique, 2ᵉ entrée différente : c'est le cas que la comparaison de
    // la seule dernière OTA laisserait passer.
    const longue = { groupes: ['05baae2a', '2b0a3053', '4d38f61c'], commits: ['d71c3a2', '79c3638', '788ab09'] };
    const courte = { groupes: ['05baae2a', 'a3a119de'], commits: ['d71c3a2', '5dbef80'] };
    const ecarts = chaineDivergente(longue, courte);
    expect(ecarts).toHaveLength(2);
    expect(ecarts[0]).toContain('n°2');
  });

  it('elle dit NON quand la fiche courte remonte plus loin que la longue', () => {
    const longue = { groupes: ['05baae2a'], commits: ['d71c3a2'] };
    const courte = { groupes: ['05baae2a', '2b0a3053'], commits: ['d71c3a2', '79c3638'] };
    expect(chaineDivergente(longue, courte)).toHaveLength(2);
  });

  it('une chaîne VIDE n’est pas un préfixe valide', () => {
    const longue = { groupes: ['05baae2a'], commits: ['d71c3a2'] };
    expect(chaineDivergente(longue, { groupes: [], commits: [] })).toHaveLength(2);
  });

  it('elle dit OUI : un préfixe strict ne rend aucun écart', () => {
    const longue = { groupes: ['05baae2a', '2b0a3053', '4d38f61c'], commits: ['d71c3a2', '79c3638', '788ab09'] };
    const courte = { groupes: ['05baae2a', '2b0a3053'], commits: ['d71c3a2', '79c3638'] };
    expect(chaineDivergente(longue, courte)).toEqual([]);
  });
});

// ── Une publication n'est plus un groupe ─────────────────────────────────────
//
// 🔴 CE QUE CE BLOC FERME, écrit le 2026-09-07 après l'avoir payé une fois.
// Sous `runtimeVersion: fingerprint`, `eas update` dépose UN GROUPE PAR
// PLATEFORME. `check:ota` lisait le premier et en déduisait les plateformes : il
// a donc rendu « plateformes : android ≠ android + ios » et « mauvais groupe »
// sur la 26ᵉ OTA, qui était parfaitement correcte. Un contrôle rouge sur du vrai
// pousse à corriger les fiches jusqu'à ce qu'elles mentent — c'est pire que pas
// de contrôle du tout.
const entree = (group: string, platforms: string, runtimeVersion: string, message: string) =>
  ({ group, platforms, runtimeVersion, message });

const VINGT_SIXIEME = [
  entree('f364ba3c-38b5-4543-93f4-9439a467e52e', 'ios', 'dfe034fd', '"26e OTA" (5 minutes ago)'),
  entree('4ced0969-4cae-482b-b17e-d00dbfa27a90', 'android', 'e3c4baca', '"26e OTA" (5 minutes ago)'),
  entree('bf9894b4-1111-2222-3333-444444444444', 'android, ios', '1.0.0', '"25e OTA" (11 days ago)'),
];

describe('publicationEnTete', () => {
  it('elle réunit les DEUX groupes d’une même publication', () => {
    const p = publicationEnTete(VINGT_SIXIEME)!;
    expect(p.groupes).toEqual(['f364ba3c', '4ced0969']);
    expect(p.plateformes).toEqual(['android', 'ios']);
    expect(p.runtimes).toEqual(['dfe034fd', 'e3c4baca']);
  });

  it('elle s’ARRÊTE au message suivant — la 25ᵉ ne déborde pas dans la 26ᵉ', () => {
    // La mutation qui l'a vérifié : une borne à `rupture + 1` avalait la ligne
    // suivante, et « bf9894b4 » se retrouvait dans la publication du jour.
    expect(publicationEnTete(VINGT_SIXIEME)!.groupes).not.toContain('bf9894b4');
  });

  it('elle lit encore l’ANCIEN régime : un seul groupe, deux plateformes', () => {
    const p = publicationEnTete([VINGT_SIXIEME[2]])!;
    expect(p.groupes).toEqual(['bf9894b4']);
    expect(p.plateformes).toEqual(['android', 'ios']);
  });

  it('un canal vide rend `null` — jamais une publication vide qui passerait au vert', () => {
    expect(publicationEnTete([])).toBeNull();
  });
});

// ── « Servi » ≠ « servi pour la PREMIÈRE fois » ──────────────────────────────
//
// 🔴 CE QUE CE BLOC FERME, écrit le 2026-09-08 après l'avoir vu. Le contrôle
// exigeait, pour un texte servi, que sa date d'entrée en vigueur ne précède pas la
// publication EN TÊTE du canal. Juste quand cette publication est la première à
// porter ce texte ; faux dès la suivante. La 27ᵉ OTA a republié sans le changer un
// texte entré en vigueur le 7 — et le contrôle a réclamé le 8.
//
// ⚠️ Le suivre aurait fait décaler d'un jour une date d'entrée en vigueur pour
// satisfaire un instrument : mentir dans un document opposable. Un contrôle rouge
// sur du VRAI est plus nuisible qu'un contrôle absent — c'est le deuxième de la
// même famille en deux jours, après « un groupe par plateforme ».
const etat = (o: Partial<Parameters<typeof verdictDateLegale>[0]>) => verdictDateLegale({
  jourTexte: '2026-09-07', jourPublication: '2026-09-08', aujourdHui: '2026-09-08',
  servi: true, dejaServiAvant: true, ...o,
});

describe('verdictDateLegale', () => {
  it('LE CAS DE LA 27ᵉ : republier un texte déjà servi ne redate rien', () => {
    const v = etat({});
    expect(v.ok).toBe(true);
    expect(v.regle).toContain('pas dans le futur');
  });

  it('…mais un texte déjà servi ne peut pas prendre effet DEMAIN', () => {
    expect(etat({ jourTexte: '2026-09-09' }).ok).toBe(false);
  });

  it('première mise en service : la date ne peut pas PRÉCÉDER la publication', () => {
    expect(etat({ dejaServiAvant: false }).ok).toBe(false);
    expect(etat({ dejaServiAvant: false, jourTexte: '2026-09-08' }).ok).toBe(true);
    expect(etat({ dejaServiAvant: false }).regle).toContain('≥ publication');
  });

  it('texte pas encore servi : sa date ne peut pas être déjà passée', () => {
    expect(etat({ servi: false }).ok).toBe(false);
    expect(etat({ servi: false, jourTexte: '2026-09-08' }).ok).toBe(true);
    expect(etat({ servi: false }).regle).toContain('pas déjà passée');
  });

  it('les trois branches sont DISTINCTES — aucune ne recouvre l’autre', () => {
    const regles = new Set([
      etat({ servi: false }).regle,
      etat({ dejaServiAvant: false }).regle,
      etat({}).regle,
    ]);
    expect(regles.size).toBe(3);
  });
});
