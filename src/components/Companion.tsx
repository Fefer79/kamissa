// Le compagnon de progression (cadrage §2.2 de la note conceptuelle) :
// le manguier qui pousse sur le livre — le logo qui se construit, compétence
// après compétence. Métaphore lisible sans texte ni chiffres (C1).
//   étage 0 : le livre et la graine
//   étage 1 : la pousse de manguier
//   étage 2 : la mangue-soleil
//   étage 3 : les ondes de la voix — l'emblème complet
export function Compagnon({ etage }: { etage: number }) {
  return (
    <svg viewBox="0 0 120 120" class="compagnon" role="img" aria-label="Ton manguier grandit">
      <rect width="120" height="120" rx="28" fill="#2E3D96" />
      <path
        d="M24 74 C38 66,50 66,60 72 C70 66,82 66,96 74 L96 85 C82 77,70 77,60 83 C50 77,38 77,24 85 Z"
        fill="#FDF8EF"
      />
      {etage === 0 && <circle cx="60" cy="66" r="5" fill="#1FA05C" />}
      {etage >= 1 && (
        <>
          <path d="M60 72 L60 49" stroke="#1FA05C" stroke-width="5" stroke-linecap="round" fill="none" />
          <path d="M60 61 C51 61,45 56,44 48 C52 48,58 53,60 61 Z" fill="#1FA05C" />
          <path d="M60 55 C69 55,75 50,76 42 C68 42,62 47,60 55 Z" fill="#1FA05C" />
        </>
      )}
      {etage >= 2 && <circle cx="60" cy="39" r="9.5" fill="#FFB81C" />}
      {etage >= 3 && (
        <>
          <path d="M75 30 a13 13 0 0 1 8 11" stroke="#E8482B" stroke-width="4.5" stroke-linecap="round" fill="none" />
          <path d="M80 21 a21 21 0 0 1 12 17" stroke="#E8482B" stroke-width="4.5" stroke-linecap="round" fill="none" />
        </>
      )}
    </svg>
  )
}

/** Mot-symbole kamissa — toujours en minuscules, point du « i » corail (charte §03). */
export function LogoMot() {
  return (
    <h1 class="logo-mot">
      kam<span>i</span>ssa
    </h1>
  )
}
