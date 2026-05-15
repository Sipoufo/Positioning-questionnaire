// questionnaire.ts
// Single source of truth for the Happy Cash Positioning Questionnaire.
// Consumed by the frontend (rendering + client validation) and the backend
// (server validation + PDF generation). Mirrors HC_05_Questionnaire_Positionnement.md.

import type {
  I18nText,
  PartialResponse,
  Question,
  QuestionOption,
  Section,
} from './types.js';

/** Helper to keep the schema readable when declaring bilingual strings inline. */
const t = (fr: string, en: string): I18nText => ({ fr, en });

/** Helper to build an option that exposes a free-text "precise" companion field. */
const opt = (value: string, fr: string, en: string, withPrecision = false): QuestionOption => ({
  value,
  label: t(fr, en),
  ...(withPrecision ? { withPrecision: true } : {}),
});

// -----------------------------------------------------------------------------
// Conditional visibility predicates
// -----------------------------------------------------------------------------

/** True when the respondent picked Niveau 1 (Fondateur). */
const isLevel1 = (r: PartialResponse): boolean => r['q2.1'] === 'niveau1';

/** True when the respondent picked Niveau 1 or Niveau 2. */
const isLevel1or2 = (r: PartialResponse): boolean =>
  r['q2.1'] === 'niveau1' || r['q2.1'] === 'niveau2';

/**
 * True when the financial contribution declared in Q6.1 is ≥ 50 000 FCFA.
 * Drives Q6.2 (return-on-investment horizon) as required.
 */
const hasMonetaryContribution = (r: PartialResponse): boolean => {
  const v = r['q6.1'];
  return (
    v === 'up_to_50k' ||
    v === '50k_100k' ||
    v === '100k_300k' ||
    v === '300k_500k' ||
    v === 'above_500k'
  );
};

// -----------------------------------------------------------------------------
// Sections
// -----------------------------------------------------------------------------

const SECTION_1: Section = {
  number: 1,
  title: t('Identité et coordonnées', 'Identity and contact details'),
  questions: [
    {
      id: 'q1.1',
      section: 1,
      type: 'text',
      required: true,
      label: t('Nom complet', 'Full name'),
      maxLength: 120,
    },
    {
      id: 'q1.2',
      section: 1,
      type: 'tel',
      required: true,
      label: t('Numéro de téléphone WhatsApp', 'WhatsApp phone number'),
      placeholder: t('+237 ...', '+237 ...'),
      maxLength: 30,
    },
    {
      id: 'q1.3',
      section: 1,
      type: 'email',
      required: true,
      label: t('Adresse email', 'Email address'),
      maxLength: 120,
    },
    {
      id: 'q1.4',
      section: 1,
      type: 'radio',
      required: true,
      label: t('Ville et quartier de résidence', 'City and neighborhood'),
      options: [
        opt('yaounde', 'Yaoundé', 'Yaoundé'),
        opt('douala', 'Douala', 'Douala'),
        opt('bafoussam', 'Bafoussam', 'Bafoussam'),
        opt('other_cm', 'Autre ville au Cameroun (précise)', 'Other city in Cameroon (specify)', true),
        opt('abroad', 'Hors Cameroun (précise pays et ville)', 'Outside Cameroon (specify country and city)', true),
      ],
    },
    {
      id: 'q1.5',
      section: 1,
      type: 'radio',
      required: true,
      label: t('Profession actuelle', 'Current occupation'),
      options: [
        opt('employee', 'Salarié (précise secteur et fonction)', 'Employee (specify sector and role)', true),
        opt('entrepreneur', 'Entrepreneur / Indépendant (précise activité)', 'Entrepreneur / Independent (specify activity)', true),
        opt('jobseeker', "En recherche d'emploi", 'Job seeker'),
        opt('other', 'Autre (précise)', 'Other (specify)', true),
      ],
    },
  ],
};

const SECTION_2: Section = {
  number: 2,
  title: t("Niveau d'engagement choisi", 'Chosen engagement level'),
  questions: [
    {
      id: 'q2.1',
      section: 2,
      type: 'radio',
      required: true,
      label: t(
        "Quel niveau d'engagement correspond le mieux à ce que tu peux donner aujourd'hui ?",
        'Which engagement level matches what you can give today?',
      ),
      helper: t('Choisis UN seul niveau.', 'Pick ONE level only.'),
      options: [
        opt(
          'niveau1',
          'Niveau 1 — Fondateur Happy Cash : engagement permanent, contribution active à au moins un projet, présence à toutes les AG, engagement 3 ans minimum.',
          'Level 1 — Founder: permanent commitment, active contribution to at least one project, attendance at every general meeting, 3-year minimum.',
        ),
        opt(
          'niveau2',
          'Niveau 2 — Membre actif : minimum 10h/semaine sur un ou plusieurs projets, présence régulière aux réunions.',
          'Level 2 — Active member: at least 10h/week on one or more projects, regular meeting attendance.',
        ),
        opt(
          'niveau3',
          'Niveau 3 — Advisor : apport en conseil, réseau, expertise. Disponibilité 1 à 2 fois par mois.',
          'Level 3 — Advisor: advice, network, expertise. Available 1–2 times a month.',
        ),
        opt(
          'niveau4',
          "Niveau 4 — Ami du collectif : soutien moral, retours, participation aux événements internes. Pas d'engagement formel.",
          'Level 4 — Friend of the collective: moral support, feedback, attendance at internal events. No formal commitment.',
        ),
      ],
    },
    {
      id: 'q2.2',
      section: 2,
      type: 'textarea',
      required: false,
      label: t(
        "Explique en 2-3 phrases pourquoi tu as choisi ce niveau et pas un autre",
        'Explain in 2–3 sentences why you picked this level and not another',
      ),
      helper: t('Facultatif mais recommandé.', 'Optional but recommended.'),
      maxLength: 800,
    },
    {
      id: 'q2.3',
      section: 2,
      type: 'radio',
      required: true,
      label: t(
        'Est-ce que ce niveau pourrait évoluer dans les 6 prochains mois ?',
        'Could this level change in the next 6 months?',
      ),
      options: [
        opt('up', 'Oui, je vise un niveau supérieur (lequel ?)', 'Yes, aiming for a higher level (which?)', true),
        opt('down', 'Oui, possiblement un niveau inférieur (lequel ?)', 'Yes, possibly a lower level (which?)', true),
        opt('stable', "Non, c'est stable", 'No, stable'),
      ],
    },
  ],
};

const SECTION_3: Section = {
  number: 3,
  title: t('Si tu as choisi Niveau 1 ou 2', 'If you picked Level 1 or 2'),
  intro: t(
    'Cette section concerne uniquement les Niveaux 1 et 2.',
    'This section only applies to Levels 1 and 2.',
  ),
  visibleWhen: isLevel1or2,
  questions: [
    {
      id: 'q3.1',
      section: 3,
      type: 'radio',
      required: true,
      visibleWhen: isLevel1,
      requiredWhen: isLevel1,
      label: t(
        "Confirmes-tu l'engagement de 3 ans minimum dans Happy Cash ?",
        'Do you confirm the 3-year minimum commitment to Happy Cash?',
      ),
      helper: t('Niveau 1 uniquement.', 'Level 1 only.'),
      options: [
        opt('yes', 'Oui, sans réserve', 'Yes, without reservation'),
        opt('yes_with_reserves', 'Oui, avec quelques réserves (précise lesquelles)', 'Yes, with some reservations (specify)', true),
        opt('thinking', "Pas encore, j'ai besoin de réfléchir", 'Not yet, I need to think it over'),
      ],
    },
    {
      id: 'q3.2',
      section: 3,
      type: 'checkbox',
      required: true,
      visibleWhen: isLevel1or2,
      requiredWhen: isLevel1or2,
      label: t("Quel(s) projet(s) t'intéresse(nt) en priorité ?", 'Which project(s) interest you most?'),
      options: [
        opt('molah', "Molah (plateforme d'avis sur les lieux et événements au Cameroun)", 'Molah (review platform for places and events in Cameroon)'),
        opt('project_2', "Le 2e projet (à définir — j'aimerais participer à sa réflexion)", 'The 2nd project (TBD — I want to help shape it)'),
        opt('own_idea', "J'ai ma propre idée de projet que je veux porter (décris-la en Q5)", 'I have my own project idea (describe in Q5)'),
        opt('flexible', 'Indifférent, je rejoindrai là où il y a besoin', "No preference, I'll join where needed"),
      ],
    },
    {
      id: 'q3.3',
      section: 3,
      type: 'radio',
      required: true,
      visibleWhen: isLevel1or2,
      requiredWhen: isLevel1or2,
      label: t(
        "Combien d'heures par semaine peux-tu consacrer réellement au projet, en moyenne ?",
        'How many hours per week can you really dedicate, on average?',
      ),
      options: [
        opt('5_10', '5-10 heures par semaine', '5–10 hours per week'),
        opt('10_15', '10-15 heures par semaine', '10–15 hours per week'),
        opt('15_20', '15-20 heures par semaine', '15–20 hours per week'),
        opt('20_30', '20-30 heures par semaine', '20–30 hours per week'),
        opt('30_plus', 'Plus de 30 heures par semaine (équivalent quasi full-time)', 'More than 30 hours per week (near full-time)'),
      ],
    },
    {
      id: 'q3.4',
      section: 3,
      type: 'radio',
      required: true,
      visibleWhen: isLevel1or2,
      requiredWhen: isLevel1or2,
      label: t("Quelle plage horaire t'est la plus accessible ?", 'Which time slot suits you best?'),
      options: [
        opt('evenings', 'Soirées en semaine (après 18h)', 'Weekday evenings (after 6 PM)'),
        opt('lunch', 'Pauses déjeuner en semaine', 'Weekday lunch breaks'),
        opt('weekend_morning', 'Matinées du week-end', 'Weekend mornings'),
        opt('weekend_afternoon', 'Après-midi / soirées du week-end', 'Weekend afternoons / evenings'),
        opt('any', 'Indifférent', 'No preference'),
      ],
    },
  ],
};

const SECTION_4: Section = {
  number: 4,
  title: t('Compétences mobilisables', 'Mobilizable skills'),
  questions: [
    {
      id: 'q4.1',
      section: 4,
      type: 'checkbox',
      required: true,
      label: t(
        'Dans quels domaines tu peux contribuer concrètement ?',
        'Which areas can you concretely contribute to?',
      ),
      helper: t('Plusieurs choix possibles.', 'Multiple choices allowed.'),
      options: [
        opt('dev', 'Développement logiciel (Flutter, Spring Boot, autres — précise)', 'Software development (Flutter, Spring Boot, others — specify)', true),
        opt('design', 'Design graphique et UX/UI', 'Graphic design and UX/UI'),
        opt('marketing', 'Marketing digital et community management', 'Digital marketing and community management'),
        opt('comms', 'Communication, relations presse, storytelling', 'Communications, PR, storytelling'),
        opt('finance', 'Finance, comptabilité, gestion', 'Finance, accounting, management'),
        opt('legal', "Juridique, droit des affaires, contrats", 'Legal, business law, contracts'),
        opt('biz_dev', 'Business development, partenariats, ventes', 'Business development, partnerships, sales'),
        opt('media', 'Photographie, vidéo, production de contenu', 'Photography, video, content production'),
        opt('events', 'Animation de communauté, événementiel', 'Community animation, events'),
        opt('research', 'Recherche utilisateur, études de marché', 'User research, market studies'),
        opt('pm', 'Gestion de projet, coordination', 'Project management, coordination'),
        opt('other', 'Autre (précise)', 'Other (specify)', true),
      ],
    },
    {
      id: 'q4.2',
      section: 4,
      type: 'textarea',
      required: false,
      label: t(
        "Pour chacune des compétences cochées, donne une note d'auto-évaluation",
        'For each skill ticked, give a self-evaluation',
      ),
      helper: t(
        'Format : « domaine — niveau » (débutant / intermédiaire / avancé / expert), une ligne par domaine.',
        'Format: "area — level" (beginner / intermediate / advanced / expert), one line per area.',
      ),
      maxLength: 1500,
    },
    {
      id: 'q4.3',
      section: 4,
      type: 'textarea',
      required: false,
      label: t(
        'Quels sont tes meilleurs atouts personnels ? Trois mots qui te décrivent comme contributeur',
        'What are your strongest assets? Three words that describe you as a contributor',
      ),
      maxLength: 200,
    },
  ],
};

const SECTION_5: Section = {
  number: 5,
  title: t('Réseau et apports non financiers', 'Network and non-financial contributions'),
  questions: [
    {
      id: 'q5.1',
      section: 5,
      type: 'checkbox',
      required: false,
      label: t(
        'Quels réseaux ou contacts utiles peux-tu mobiliser pour le collectif ?',
        'Which networks or useful contacts can you mobilize for the collective?',
      ),
      helper: t('Plusieurs choix possibles.', 'Multiple choices allowed.'),
      options: [
        opt('local_business', 'Commerçants et entrepreneurs locaux', 'Local merchants and entrepreneurs'),
        opt('media', 'Médias (presse, radio, TV)', 'Media (press, radio, TV)'),
        opt('influencers', 'Influenceurs et créateurs de contenu', 'Influencers and content creators'),
        opt('admin', 'Administration publique', 'Public administration'),
        opt('banks', 'Banques et institutions financières', 'Banks and financial institutions'),
        opt('diaspora', 'Diaspora camerounaise', 'Cameroonian diaspora'),
        opt('education', 'Universités et écoles', 'Universities and schools'),
        opt('incubators', 'Incubateurs et accélérateurs', 'Incubators and accelerators'),
        opt('investors', 'Investisseurs et business angels', 'Investors and business angels'),
        opt('other', 'Autre (précise)', 'Other (specify)', true),
      ],
    },
    {
      id: 'q5.2',
      section: 5,
      type: 'textarea',
      required: false,
      label: t(
        "As-tu une idée de projet personnel que tu aimerais proposer à Happy Cash ? Décris-la en 5 lignes maximum",
        'Do you have a personal project idea to propose to Happy Cash? Describe it in 5 lines maximum',
      ),
      maxLength: 1000,
    },
    {
      id: 'q5.3',
      section: 5,
      type: 'checkbox',
      required: false,
      label: t(
        'Possèdes-tu du matériel ou des ressources que tu serais prêt à mettre à disposition du collectif ?',
        'Do you have equipment or resources you would lend to the collective?',
      ),
      options: [
        opt('it_equipment', 'Équipement informatique', 'IT equipment'),
        opt('workspace', 'Local ou espace de travail', 'Workspace or office'),
        opt('vehicle', 'Véhicule', 'Vehicle'),
        opt('av_gear', 'Matériel audiovisuel', 'Audiovisual gear'),
        opt('other', 'Autre (précise)', 'Other (specify)', true),
      ],
    },
  ],
};

const SECTION_6: Section = {
  number: 6,
  title: t('Apport financier envisagé', 'Considered financial contribution'),
  intro: t(
    "Cette section est indicative et n'engage pas définitivement. Les montants exacts seront discutés à la 2e réunion. L'objectif est d'avoir une idée des fourchettes possibles pour structurer la SAS.",
    'This section is indicative and not binding. Exact amounts will be discussed at the 2nd meeting. The goal is to get a sense of possible ranges to structure the SAS.',
  ),
  visibleWhen: isLevel1or2,
  questions: [
    {
      id: 'q6.1',
      section: 6,
      type: 'radio',
      required: true,
      visibleWhen: isLevel1or2,
      requiredWhen: isLevel1or2,
      label: t('Peux-tu apporter un capital initial à Happy Cash ?', 'Can you contribute initial capital to Happy Cash?'),
      options: [
        opt('up_to_50k', "Oui, jusqu'à 50 000 FCFA", 'Yes, up to 50,000 FCFA'),
        opt('50k_100k', 'Oui, entre 50 000 et 100 000 FCFA', 'Yes, between 50,000 and 100,000 FCFA'),
        opt('100k_300k', 'Oui, entre 100 000 et 300 000 FCFA', 'Yes, between 100,000 and 300,000 FCFA'),
        opt('300k_500k', 'Oui, entre 300 000 et 500 000 FCFA', 'Yes, between 300,000 and 500,000 FCFA'),
        opt('above_500k', 'Oui, plus de 500 000 FCFA (précise une fourchette)', 'Yes, more than 500,000 FCFA (specify a range)', true),
        opt('industry_only', 'Non, je préfère apporter en industrie (temps de travail) uniquement', 'No, I prefer to contribute time only'),
        opt('thinking', "Je ne sais pas encore, j'ai besoin de réfléchir", 'I am still thinking'),
      ],
    },
    {
      id: 'q6.2',
      section: 6,
      type: 'radio',
      required: false,
      visibleWhen: hasMonetaryContribution,
      requiredWhen: hasMonetaryContribution,
      label: t(
        'Sur quel horizon de retour sur investissement te projettes-tu ?',
        'What return-on-investment horizon do you envision?',
      ),
      helper: t('Obligatoire si Q6.1 ≥ 50 000 FCFA.', 'Required if Q6.1 ≥ 50,000 FCFA.'),
      options: [
        opt('short', 'Court terme (1-2 ans)', 'Short term (1–2 years)'),
        opt('medium', 'Moyen terme (3-5 ans)', 'Medium term (3–5 years)'),
        opt('long', 'Long terme (5 ans et plus)', 'Long term (5+ years)'),
        opt('none', "Je n'attends pas de retour spécifique, je crois au projet", 'No specific expectation, I believe in the project'),
      ],
    },
  ],
};

const SECTION_7: Section = {
  number: 7,
  title: t('Propositions pour le nom du collectif', "Name proposals for the collective"),
  intro: t(
    'Nous avons décidé collectivement de remplacer « Happy Cash ». Le vote aura lieu à la 2e réunion.',
    'We have collectively decided to replace "Happy Cash". The vote will be held at the 2nd meeting.',
  ),
  questions: [
    {
      id: 'q7.1',
      section: 7,
      type: 'textarea',
      required: false,
      label: t("Ta ou tes proposition(s) de nom (jusqu'à 3)", 'Your name proposal(s) (up to 3)'),
      helper: t('Une proposition par ligne.', 'One proposal per line.'),
      maxLength: 400,
    },
    {
      id: 'q7.2',
      section: 7,
      type: 'textarea',
      required: false,
      label: t(
        'Pour chacune, justifie ton choix en 1-2 lignes (sens, sonorité, intention)',
        'For each, justify in 1–2 lines (meaning, sound, intent)',
      ),
      maxLength: 800,
    },
    {
      id: 'q7.3',
      section: 7,
      type: 'text',
      required: false,
      label: t(
        "Parmi les noms proposés par les autres jusqu'ici, lequel te plaît le plus ?",
        "Of the names proposed by others so far, which do you like best?",
      ),
      maxLength: 120,
    },
  ],
};

const SECTION_8: Section = {
  number: 8,
  title: t('Valeurs et culture', 'Values and culture'),
  questions: [
    {
      id: 'q8.1',
      section: 8,
      type: 'checkbox',
      required: true,
      maxSelected: 3,
      label: t(
        'Parmi ces 6 valeurs proposées à la réunion, lesquelles te tiennent particulièrement à cœur ?',
        'Of these 6 values proposed at the meeting, which matter most to you?',
      ),
      helper: t('Coche jusqu’à 3.', 'Tick up to 3.'),
      options: [
        opt('engagement', 'Engagement', 'Commitment'),
        opt('transparence', 'Transparence', 'Transparency'),
        opt('responsabilite', 'Responsabilité', 'Responsibility'),
        opt('excellence', 'Excellence', 'Excellence'),
        opt('solidarite', 'Solidarité', 'Solidarity'),
        opt('confidentialite', 'Confidentialité', 'Confidentiality'),
      ],
    },
    {
      id: 'q8.2',
      section: 8,
      type: 'textarea',
      required: false,
      label: t(
        'Y a-t-il une valeur manquante que tu voudrais ajouter ?',
        'Is there a missing value you would add?',
      ),
      maxLength: 300,
    },
    {
      id: 'q8.3',
      section: 8,
      type: 'textarea',
      required: false,
      label: t(
        'Quelle est, selon toi, la principale raison qui pourrait faire échouer Happy Cash ?',
        'What do you think is the main reason Happy Cash could fail?',
      ),
      maxLength: 800,
    },
  ],
};

const SECTION_9: Section = {
  number: 9,
  title: t('Doutes et conditions', 'Doubts and conditions'),
  questions: [
    {
      id: 'q9.1',
      section: 9,
      type: 'textarea',
      required: false,
      label: t(
        'Quelles sont tes principales préoccupations ou réserves vis-à-vis du projet ?',
        'What are your main concerns or reservations about the project?',
      ),
      maxLength: 1000,
    },
    {
      id: 'q9.2',
      section: 9,
      type: 'textarea',
      required: false,
      label: t(
        "Y a-t-il des conditions sans lesquelles tu ne pourrais pas t'engager au niveau indiqué ?",
        'Are there conditions without which you could not commit at the chosen level?',
      ),
      maxLength: 1000,
    },
    {
      id: 'q9.3',
      section: 9,
      type: 'textarea',
      required: false,
      label: t(
        "Y a-t-il un sujet que tu aimerais qu'on aborde à la 2e réunion (23 mai 2026) ?",
        'Is there a topic you would like discussed at the 2nd meeting (23 May 2026)?',
      ),
      maxLength: 800,
    },
  ],
};

const SECTION_10: Section = {
  number: 10,
  title: t('Engagement de confidentialité', 'Confidentiality undertaking'),
  intro: t(
    'En soumettant ce questionnaire, je m’engage à respecter les points suivants. Toutes les cases sont obligatoires.',
    'By submitting this questionnaire I commit to the following. All boxes are mandatory.',
  ),
  questions: [
    {
      id: 'q10.1',
      section: 10,
      type: 'consent',
      required: true,
      label: t('Engagements', 'Commitments'),
      options: [
        opt(
          'no_disclosure',
          'Ne pas divulguer le contenu des discussions Happy Cash en dehors du cercle des membres.',
          'Not disclose the content of Happy Cash discussions outside the member circle.',
        ),
        opt(
          'no_sharing',
          "Ne pas partager les documents internes (note de cadrage, plans, données financières) avec des personnes extérieures sans autorisation.",
          'Not share internal documents (scoping notes, plans, financial data) with outsiders without authorization.',
        ),
        opt(
          'ip_respect',
          'Respecter la propriété intellectuelle des idées et projets discutés au sein du collectif.',
          'Respect the intellectual property of ideas and projects discussed within the collective.',
        ),
        opt(
          'conflict_disclosure',
          "Signaler tout conflit d'intérêt potentiel (lien avec un concurrent, employeur en conflit, etc.) avant la 2e réunion.",
          'Report any potential conflict of interest (link to a competitor, conflicting employer, etc.) before the 2nd meeting.',
        ),
      ],
    },
  ],
};

const SECTION_11: Section = {
  number: 11,
  title: t('Pour finir', 'To wrap up'),
  questions: [
    {
      id: 'q11.1',
      section: 11,
      type: 'textarea',
      required: false,
      label: t(
        "As-tu autre chose à partager qui n'a pas été couvert par ce questionnaire ?",
        'Is there anything else you want to share that was not covered?',
      ),
      maxLength: 1500,
    },
    {
      id: 'q11.2',
      section: 11,
      type: 'scale',
      required: true,
      label: t(
        'Comment as-tu vécu la première réunion du 14 mai ?',
        'How did you experience the first meeting of 14 May?',
      ),
      options: [
        opt('1', "1 — Je n'ai pas compris l'intérêt", "1 — I didn't see the point"),
        opt('2', '2 — Mitigé', '2 — Mixed feelings'),
        opt('3', '3 — Correct', '3 — Okay'),
        opt('4', '4 — Bien, je suis intéressé', '4 — Good, I am interested'),
        opt('5', '5 — Excellent, je suis enthousiaste', '5 — Excellent, I am enthusiastic'),
      ],
    },
    {
      id: 'q11.2.comment',
      section: 11,
      type: 'textarea',
      required: false,
      label: t('Commentaire libre sur la réunion (facultatif)', 'Free comment on the meeting (optional)'),
      maxLength: 800,
    },
  ],
};

/**
 * Ordered list of every section in the questionnaire. The step engine walks
 * this array and skips sections whose `visibleWhen` predicate returns false.
 */
export const SECTIONS: readonly Section[] = [
  SECTION_1,
  SECTION_2,
  SECTION_3,
  SECTION_4,
  SECTION_5,
  SECTION_6,
  SECTION_7,
  SECTION_8,
  SECTION_9,
  SECTION_10,
  SECTION_11,
];

/** Flat list of every question — useful for response payload iteration. */
export const ALL_QUESTIONS: readonly Question[] = SECTIONS.flatMap((s) => s.questions);

/** Lookup a question by id. Returns undefined if unknown. */
export const getQuestionById = (id: string): Question | undefined =>
  ALL_QUESTIONS.find((q) => q.id === id);

/**
 * Returns the list of sections that should be displayed for the current response.
 * Empty sections (where every question is hidden) are also filtered out.
 */
export const getVisibleSections = (response: PartialResponse): Section[] =>
  SECTIONS.filter((section) => {
    if (section.visibleWhen && !section.visibleWhen(response)) return false;
    const visibleQuestions = section.questions.filter(
      (q) => !q.visibleWhen || q.visibleWhen(response),
    );
    return visibleQuestions.length > 0;
  });

/** Returns the questions inside a section that should be displayed. */
export const getVisibleQuestions = (section: Section, response: PartialResponse): Question[] =>
  section.questions.filter((q) => !q.visibleWhen || q.visibleWhen(response));

/**
 * Returns true when a question is effectively required for the current response.
 * Combines `required` (static) with `requiredWhen` (dynamic).
 */
export const isQuestionRequired = (question: Question, response: PartialResponse): boolean => {
  if (question.requiredWhen) return question.requiredWhen(response);
  return question.required;
};
