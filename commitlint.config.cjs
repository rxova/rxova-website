module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 120],
    // Off, not relaxed: on a squash merge GitHub composes the body from the PR
    // description, which is prose and URLs written in a textarea that does not
    // wrap. Enforcing a wrap width there fails the commit only once it is
    // already on main, where the message can no longer be edited.
    'body-max-line-length': [0, 'always'],
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
