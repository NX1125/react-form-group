#!/usr/bin/env python3

import re

from pathlib import Path

dist_regex = re.compile(r'dist_(\d+)')

if __name__ == '__main__':
    i = 0
    for path in Path('dist').glob('**/dist_*'):
        match = dist_regex.fullmatch(path.name)
        if match is None:
            continue

        i = max(i, int(match.group(1)))

    print(f'./dist/dist_{i + 1}')
