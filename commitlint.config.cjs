module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 120],
    // Off: squash merges build the body from the unwrapped PR description, and a
    // failure there only surfaces once the commit is on main and can't be edited.
    'body-max-line-length': [0, 'always'],
    // Off too: a prose line like "Note: …" makes the parser treat everything after
    // it as footer, where the line cap would still apply.
    'footer-max-line-length': [0, 'always'],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'rename',
        'revert',
        'style',
        'test',
      ],
    ],
  },
}
