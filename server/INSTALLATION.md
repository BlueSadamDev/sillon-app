# Relais Sillon : installation sur le mini PC (prototype du lot 7.0)

Ce guide installe le **relais prototype** sur le mini PC (Minisforum Z83-F, Debian). Le relais range et transmet des messages **chiffrés par tes appareils** : il ne peut pas les lire. Au lot 7.0, il ne sert qu'aux bancs d'essai de l'app « Sillon (essai) », jamais à tes vraies notes.

Ce qu'il ne touche pas :
- **AdGuard Home** : sa configuration et ses ports (53, 80, 3000) restent tels quels ;
- **le pare-feu** : le relais n'écoute que sur le mini PC lui-même (`127.0.0.1`, port 8787). C'est Tailscale qui le rend joignable par tes seuls appareils, en connexion chiffrée (port 8443). Rien n'est ouvert sur Internet.

Durée : environ 20 minutes. Chaque bloc de commandes se copie et se colle tel quel. `sudo` demande ton mot de passe Debian.

Vocabulaire :
- **Terminal** : la fenêtre où l'on tape des commandes. Sur le mini PC sans écran, tu t'y connectes depuis l'ordinateur avec `ssh` (voir l'étape 0).
- **Service** : programme lancé automatiquement par Debian au démarrage, et relancé s'il s'arrête.
- **Tailscale Serve** : fonction de Tailscale qui rend un programme du mini PC joignable par tes appareils, avec un certificat de sécurité fourni automatiquement.

---

## Étape 0 : se connecter au mini PC

Depuis l'ordinateur, ouvre un terminal (sous Windows : « Terminal » ou « PowerShell ») et tape (remplace `utilisateur` par ton nom d'utilisateur Debian et `minipc` par le nom ou l'adresse du mini PC) :

```sh
ssh utilisateur@minipc
```

## Étape 1 : noter l'état de départ

Ces commandes ne changent rien. Elles servent à comparer avant et après, pour le rapport.

```sh
cat /etc/debian_version
free -m
sudo ss -tulpn | grep -E ':(53|80|443|3000|8443|8787) '
systemctl status AdGuardHome --no-pager | head -5
tailscale status | head -3
```

Envoie-moi le résultat. Points à vérifier :
- **Ports 8443 et 8787** : aucune ligne ne doit les mentionner. S'ils sont déjà pris, arrête-toi et dis-le-moi.
- **Tailscale** : si `tailscale status` répond « command not found », installe Tailscale :
  ```sh
  curl -fsSL https://tailscale.com/install.sh | sh
  sudo tailscale up
  ```
  Ouvre le lien affiché, connecte-toi à ton compte Tailscale, puis relance `tailscale status`.

## Étape 2 : installer Node.js 24

Debian 13 ne fournit que Node.js 20, trop ancien pour le relais. On installe la version 24 (suivie à long terme) depuis le dépôt officiel NodeSource.

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt-get install -y nodejs
node --version
```

La dernière ligne doit afficher `v24.` suivi d'un numéro.

## Étape 3 : récupérer le code du relais

```sh
git clone --depth 1 --branch lot-7-0-faisabilite-synchro https://github.com/BlueSadamDev/sillon-app.git ~/sillon-app
sudo mkdir -p /opt/sillon-relais
sudo cp -r ~/sillon-app/server/. /opt/sillon-relais/
cd /opt/sillon-relais
sudo npm ci --omit=dev --no-audit --no-fund
sudo npm test
```

La fin doit afficher `# fail 0`. Les tests tournent sur le mini PC lui-même : ils vérifient que tout marche avec son Node.js.

## Étape 4 : créer le service

Le relais tourne sous un utilisateur à part (`sillon-relais`), qui n'a accès qu'à son propre dossier.

```sh
sudo useradd --system --no-create-home --shell /usr/sbin/nologin sillon-relais
sudo cp /opt/sillon-relais/sillon-relais.service /etc/systemd/system/
sudo ln -sf /opt/sillon-relais/sillon-relais /usr/local/bin/sillon-relais
sudo systemctl daemon-reload
sudo systemctl enable --now sillon-relais
systemctl status sillon-relais --no-pager
```

Tu dois voir `active (running)` et la ligne « Relais Sillon prêt sur 127.0.0.1:8787 ». Note la valeur de la ligne `Memory:` (mémoire au repos).

## Étape 5 : rendre le relais joignable par tes appareils (Tailscale)

1. Sur l'ordinateur, ouvre la console Tailscale (login.tailscale.com), onglet **DNS** :
   - **MagicDNS** doit être activé ;
   - dans **HTTPS Certificates**, clique sur **Enable HTTPS**.
2. Sur le mini PC :
   ```sh
   sudo tailscale serve --bg --https=8443 http://127.0.0.1:8787
   tailscale serve status
   ```
3. Recopie l'adresse affichée. Elle ressemble à `https://minipc.ton-reseau.ts.net:8443`. C'est l'**adresse du relais** que tu saisiras dans « Sillon (essai) ».
4. Vérification depuis le téléphone (Tailscale allumé) : ouvre cette adresse dans le navigateur. La page doit afficher **Upgrade Required**. C'est normal : le relais ne parle qu'à l'app, mais il est bien joignable. La première ouverture peut prendre une dizaine de secondes, le temps que Tailscale obtienne le certificat.

Ce réglage est gardé après un redémarrage du mini PC.

## Étape 6 : vérifier qu'AdGuard Home n'est pas gêné

```sh
sudo ss -tulpn | grep -E ':(53|80|443|3000|8443|8787) '
systemctl status AdGuardHome --no-pager | head -5
free -m
```

À vérifier :
- AdGuard Home est toujours `active (running)` et garde ses ports ;
- le relais (`node`) n'apparaît que sur `127.0.0.1:8787` ;
- le port 8443 appartient à `tailscaled`.

Ouvre aussi un site plein de publicités sur le téléphone, connecté au Wi-Fi de la maison : elles doivent toujours être bloquées.

## Étape 7 : test de charge

Cinq faux appareils envoient chacun 2 000 messages de 1 Kio. Le contenu est fait d'octets aléatoires : aucune note. Tout est effacé à la fin.

```sh
sillon-relais charge
systemctl status sillon-relais --no-pager | grep Memory
sillon-relais etat
```

Puis un essai plus lourd (10 faux appareils, 5 000 messages de 4 Kio chacun) :

```sh
sillon-relais charge 10 5000 4096
systemctl status sillon-relais --no-pager | grep Memory
```

Envoie-moi les lignes « Délai envoi → accusé » et `Memory:`.

## Étape 8 : redémarrages

```sh
sudo systemctl restart sillon-relais
systemctl status sillon-relais --no-pager | head -5
```

Ensuite, redémarre le mini PC (`sudo reboot`). Reconnecte-toi au bout de 2 minutes et vérifie que le relais et Tailscale Serve sont revenus seuls :

```sh
systemctl status sillon-relais --no-pager | head -5
tailscale serve status
```

## Utilisation courante

| Besoin | Commande |
| --- | --- |
| Code pour autoriser un appareil (valable 15 minutes, une seule fois) | `sillon-relais code` |
| État (appareils, messages, taille) | `sillon-relais etat` |
| Journal du relais (compteurs seulement, jamais de contenu) | `journalctl -u sillon-relais --no-pager -n 30` |
| Arrêter / relancer | `sudo systemctl stop sillon-relais` / `sudo systemctl start sillon-relais` |

## Mettre à jour le relais

```sh
cd ~/sillon-app && git pull
sudo cp -r ~/sillon-app/server/. /opt/sillon-relais/
cd /opt/sillon-relais && sudo npm ci --omit=dev --no-audit --no-fund && sudo npm test
sudo systemctl restart sillon-relais
```

## Tout retirer (fin du lot 7.0, si besoin)

Ces commandes effacent le relais et sa base. La base ne contient que des messages d'essai chiffrés.

```sh
sudo tailscale serve --https=8443 off
sudo systemctl disable --now sillon-relais
sudo rm /etc/systemd/system/sillon-relais.service /usr/local/bin/sillon-relais
sudo rm -r /opt/sillon-relais /var/lib/sillon-relais
sudo userdel sillon-relais
```
