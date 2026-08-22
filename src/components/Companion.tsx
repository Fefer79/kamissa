// Le compagnon de progression (cadrage §2.2 de la note conceptuelle) :
// le manguier qui pousse sur le livre — le logo qui se construit, compétence
// après compétence. Métaphore lisible sans texte ni chiffres (C1).
//   étage 0 : le livre et la graine
//   étage 1 : la pousse de manguier
//   étage 2 : la mangue-soleil
//   étage 3 : les ondes de la voix — l'emblème complet
export function Compagnon({ etage }: { etage: number }) {
  return (
    <svg viewBox="0 0 128 128" class="compagnon" role="img" aria-label="Ton manguier grandit">
      <rect width="128" height="128" rx="30" fill="#2E3D96" />
      <path
        d="M24 80 C38 70 52 70 64 80 C76 70 90 70 104 80 L104 93 C90 83 76 83 64 93 C52 83 38 83 24 93 Z"
        fill="#FDF8EF"
      />
      {etage === 0 && <circle cx="64" cy="74" r="5.5" fill="#1FA05C" />}
      {etage >= 1 && (
        <>
          <path d="M64 80 L64 64" stroke="#1FA05C" stroke-width="7" stroke-linecap="round" fill="none" />
          <path
            d="M64 66 C62 55 56 48 44 45 C45 57 52 65 64 66 Z M64 66 C66 55 72 48 84 45 C83 57 76 65 64 66 Z"
            fill="#1FA05C"
          />
        </>
      )}
      {etage >= 2 && <circle cx="64" cy="41" r="11" fill="#FFB81C" />}
      {etage >= 3 && (
        <>
          <path d="M78 30 a13 13 0 0 1 8 10" stroke="#E8482B" stroke-width="6.5" stroke-linecap="round" fill="none" />
          <path d="M85 21 a21 21 0 0 1 13 17" stroke="#E8482B" stroke-width="6.5" stroke-linecap="round" fill="none" />
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
