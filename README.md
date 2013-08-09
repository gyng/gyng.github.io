# sunfire-index
FOR SOME REASON MY GIT SUBMODULES DON'T WORK ON SUNFIRE

## Install
1. `git clone git://github.com/Fauxface/sunfire-index.git` in home directory.
2. `mv sunfire-index public_html`
3. `cd public_html/submodules`
4. `/bin/rm -rf .`
5. `git clone git://github.com/Fauxface/Graff.git graff`
6. `git clone git://github.com/Fauxface/STARFIELD.git`
7. `git clone git://github.com/Fauxface/Colck.git colck`
8. `git clone git://github.com/Fauxface/expensive-landing.git`
9. `cd ..`
10. `chmod -R 777 .`

## Install (DISREGARD THIS, SUNFIRE SUCKS)
1. `git clone git://github.com/Fauxface/sunfire-index.git` in home directory.
2. `mv sunfire-index public_html`
3. `chmod -R 777 public_html`
4. `git submodule foreach git pull` in `public_html`.