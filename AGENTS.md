# Firebase-Schutz & Entwicklungsregeln für Goodies

Bei allen Arbeiten an diesem Projekt gilt ausnahmslos:

## Oberstes Ziel
Die bestehende produktive Firebase-Infrastruktur (`goodies-food-scanner`), die standardmäßige Firestore-Datenbank (`(default)`) und alle bereits vorhandenen Daten müssen vollständig erhalten und geschützt bleiben.

---

### 1. Erlaubt
Neue Datensätze dürfen angelegt werden, wenn dies für die normale Funktion der App erforderlich ist.
- Neuen Benutzer anlegen (bei Registrierung / Login)
- Neues Produkt anlegen / ungelistete Barcodes einreichen
- Neuen Eintrag in einer vorgesehenen Collection oder Subcollection erstellen (z. B. Favoriten, Scan-History, Einkaufslisten)
- Neue Daten müssen sich strikt an das bestehende Schema (`firebase-blueprint.json`) und Datenmodell halten.

---

### 2. Nicht erlaubt (Strikt verboten)
Bestehende Daten dürfen niemals automatisch verändert oder gelöscht werden:
- Keine bestehenden Firestore-Dokumente löschen
- Keine bestehenden Firestore-Dokumente überschreiben
- Keine bestehenden Nutzerkonten löschen oder modifizieren
- Keine bestehenden Produkte verändern oder löschen
- Keine bestehenden Collections löschen oder umbenennen
- Keine automatisierten Datenmigrationen oder Datenbereinigungen durchführen
- Keine eigenständigen Änderungen an der Datenstruktur vornehmen
- Keine bestehenden Security Rules (`firestore.rules`) modifizieren oder Berechtigungen lockern
- Kein Firebase-Projekt wechseln und keine Firebase-Konfiguration ersetzen

---

### 3. Pro / Free Status-Integrität
- Der Pro-/Free-Status von Nutzern darf nicht clientseitig manipuliert werden.
- Ein Nutzer darf sich nicht durch Frontend-Code, Test-Buttons oder lokale Variablen selbst auf Pro setzen.
- Die Freischaltung erfolgt ausschließlich über die autorisierte Datenbank-/Backend-Verwaltung.

---

### 4. Entwicklungsregel bei Datenänderungen
Falls eine künftige Funktion das Ändern oder Löschen bestehender Firebase-Daten erfordern würde, darf diese Änderung **nicht eigenständig durchgeführt werden**.
Stattdessen muss dem Nutzer vorab erklärt werden:
1. Welche Änderung erforderlich wäre,
2. Welche bestehenden Daten betroffen wären,
3. Warum die Änderung benötigt wird.
Erst nach ausdrücklicher Bestätigung darf agiert werden.
