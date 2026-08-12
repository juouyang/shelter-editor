var key = [2815074099, 1725469378, 4039046167, 874293617, 3063605751, 3133984764, 4097598161, 3620741625];
var iv = sjcl.codec.hex.toBits("7475383967656A693334307438397532");
sjcl.beware["CBC mode is dangerous because it doesn't protect message integrity."]();
var isLoaded = false;

function colorHack() {
  $('.jscolor').each(function () {
    $(this).focus();
  });

  $("input").blur();
}

function colorConverter(colorhex, mode) {
  var mode = ((mode === undefined) ? false : mode);
  if (mode) {

    var hexColor = colorhex.toString(16).substring(2).toUpperCase();
    return hexColor;
  }
  else {
    var colorfos;
    var x = colorhex.substring(0, 0) + "FF" + colorhex.substring(0);
    colorfos = parseInt(x, 16);
    return colorfos;
  }
}

//lazy code addition, but I believe it is beneficial and not too invasive.
function numberCheckHelper() {
  $("input[type='number']").each(function () {
    if ($(this).val === undefined || $(this).val().trim().length == 0 || $(this).val() == null) {
      var a = $(this).attr("min");
      if (a === undefined) a = 0;
      $(this).val(a);
    }
  });
  setTimeout(numberCheckHelper, 3000);
}

function colortofos() {
  var colorhex = document.getElementsByClassName("jscolor")[0].value;
  $(".value1").html(colorConverter(colorhex));
}

$(document).ready(function () {
  numberCheckHelper();
  if (window.location.href.indexOf("?preset=") > -1 && window.location.href.indexOf("?savename=") > -1) {
    urlPreset = window.location.href.substring(window.location.href.indexOf("?preset=") + 8, window.location.href.indexOf("?savename="));
    urlSaveName = window.location.href.substring(window.location.href.indexOf("?savename=") + 10);
    preset(urlPreset, urlSaveName);
  }
});

function handleFileSelect(evt) {
  try {
    evt.stopPropagation();
    evt.preventDefault();
    var f = evt.target.files[0];
    var fileName = f.name;
    if (f.size > 3e7) {
      throw "File exceeds maximum size of 30MB"
    }
    if (f) {
      var reader = new FileReader;
      if (evt.target.id == "sav_file") {
        reader.onload = function (evt2) {
          try {
            decrypt(evt2, fileName, reader.result)
          } catch (e) {
            alert("Error: " + e)
          }
        };
        reader.readAsText(f)
      } else if (evt.target.id == "json_file") {
        reader.onload = function (evt2) {
          try {
            encrypt(evt2, fileName, reader.result)
          } catch (e) {
            alert("Error: " + e)
          }
        };
        reader.readAsText(f)
      }
    }
  } catch (e) {
    alert("Error: " + e)
  } finally {
    evt.target.value = null
  }
}

function decrypt(evt, fileName, base64Str) {
  var cipherBits = sjcl.codec.base64.toBits(base64Str);
  var prp = new sjcl.cipher.aes(key);
  var plainBits = sjcl.mode.cbc.decrypt(prp, cipherBits, iv);
  var jsonStr = sjcl.codec.utf8String.fromBits(plainBits);
  try {
    edit(fileName, JSON.parse(jsonStr));
  } catch (e) {
    throw "Decrypted file does not contain valid JSON: " + e
  }
}

function encrypt(fileName, save) {
  var compactJsonStr = JSON.stringify(save);
  var plainBits = sjcl.codec.utf8String.toBits(compactJsonStr);
  var prp = new sjcl.cipher.aes(key);
  var cipherBits = sjcl.mode.cbc.encrypt(prp, plainBits, iv);
  var base64Str = sjcl.codec.base64.fromBits(cipherBits);
  var blob = new Blob([base64Str], {
    type: "text/plain"
  });
  saveAs(blob, fileName.replace(".txt", ".sav").replace(".json", ".sav"))
}

document.getElementById("sav_file").addEventListener("change", function (e) {
  $('.box').removeClass('hover').addClass('ready');
  $('.instructions').hide();
  handleFileSelect(e);
}, false);

document.ondragover = document.ondrop = function (e) {
  e.preventDefault();
  return false;
};

$('body .container .box')
  .on('dragover', function (e) {
    $('.box').addClass('hover');
    $('.instructions').hide();
  })
  .on('dragleave', function (e) {
    $('.box').removeClass('hover');
    $('.instructions').show();
  })
  .on('drop', function (e) {
    $('.box').removeClass('hover').addClass('ready');
    $('.instructions').hide();
    var file = e.originalEvent.dataTransfer.files[0],
      fileName = file.name,
      reader = new FileReader();
    reader.onload = function (ev) {
      try {
        decrypt(ev, fileName, reader.result);
      } catch (err) {
        alert("Error: " + err);
      }
    };
    reader.readAsText(file);
    e.preventDefault();
    return false;
  });


// Modifications
function edit(fileName, save) {
  isLoaded = true;
  var scope = angular.element($('body').get(0)).scope();
  scope.$apply(function () {
    scope.save = save;
    scope.fileName = fileName;
  });
}

var app = angular.module('shelter', []);

app.controller('dwellerController', function ($scope, $http) {
  var PET_CATALOG_URLS = {
    "1.13.25": "data/pets-1.13.25.json?v=20260731-2",
    "2.5.1": "data/pets-2.5.1.json?v=20260812-1"
  };
  var COLLECTION_DWELLER_CATALOG_URLS = {
    "2.5.1": "data/dwellers-2.5.1.json?v=20260812-1"
  };
  var EQUIPMENT_CATALOG_URLS = {
    "1.13.25": "data/equipment-1.13.25.json?v=20260803-1",
    "2.5.1": "data/equipment-2.5.1.json?v=20260812-1"
  };

  $scope.section = 'vault';

  $scope.fileName = '';
  $scope.dweller = {};
  $scope.statsName = ['Unknown', 'S.', 'P.', 'E.', 'C.', 'I.', 'A.', 'L.'];
  $scope.dwellerFilters = {
    outfitId: '',
    weaponId: '',
    petId: '',
    locationId: '',
    statusId: '',
    genderId: '',
    outfits: [],
    weapons: [],
    pets: [],
    locations: []
  };
  $scope.dwellerPetId = '';
  $scope.bulkDwellerSelection = {};
  $scope.bulkDwellerCount = 0;
  $scope.bulkDwellerEdit = {
    outfitId: '',
    weaponId: '',
    petId: ''
  };
  $scope.dwellerOutfitOptions = [];
  $scope.dwellerWeaponOptions = [];
  $scope.bulkPetOptions = [];
  $scope.survivalGuideDwellers = [];
  $scope.collectionEditor = {
    saveVersion: '',
    supported: false,
    loading: false,
    ready: false,
    error: '',
    names: {}
  };
  $scope.other = {};
  $scope.petOwner = {};
  $scope.petItem = {};
  $scope.petDefinition = {};
  $scope.petEditor = {
    saveVersion: '',
    supported: false,
    loading: false,
    ready: false,
    error: '',
    catalog: {},
    pets: [],
    editedActorIds: {}
  };
  $scope.equipmentEditor = {
    saveVersion: '',
    supported: false,
    loading: false,
    ready: false,
    error: '',
    outfits: {},
    weapons: {}
  };
  $scope.wastelandTeams = [];
  $scope.wastelandTeams2 = [];
  $scope.team = {};
  $scope.actor = {};

  var _save = {},
    _lunchboxCount = 0,
    _handyCount = 0,
    _petCarrierCount = 0,
    _starterPackCount = 0,
    _vaultName = -1,
    _skinColor = null,
    _hairColor = null,
    _firstName = null,
    _otherName = null,
    _dwellerLocationById = {},
    _dwellerLocationLabels = {},
    _dwellerChildById = {},
    _dwellerGrowthLabels = {};

  Object.defineProperty($scope, 'firstName', {
    get: function () {
      return _firstName
    },
    set: function (val) {
      _firstName = val;
      if (val.trim().length == 0) {
        $scope.dweller.name = "Vault Dweller";
      }
      else {
        $scope.dweller.name = val;
      }
    }
  });

  Object.defineProperty($scope, 'otherName', {
    get: function () {
      return _otherName
    },
    set: function (val) {
      _otherName = val;
      if (val.trim().length == 0) {
        $scope.other.name = "Vault Other";
      }
      else {
        $scope.other.name = val;
      }

      var equippedPet = getEquippedPetForActor($scope.other);
      if (equippedPet && equippedPet.extraData) {
        equippedPet.extraData.uniqueName = $scope.other.name;
      }

      markSelectedPetEdited();
    }
  });

  Object.defineProperty($scope, 'vaultName', {
    get: function () {
      if (_vaultName == -1 && $scope.save !== undefined && $scope.save.vault !== undefined) _vaultName = parseInt($scope.save.vault.VaultName);
      return _vaultName
    },
    set: function (val) {
      if (val == null) val = 0;
      _vaultName = val;
      var str = "" + val;
      while (str.length < 3) str = "0" + str;
      $scope.save.vault.VaultName = str;
    }
  });

  Object.defineProperty($scope, 'skinColor', {
    get: function () {
      return _skinColor
    },
    set: function (val) {
      _skinColor = val;
      $scope.dweller.skinColor = colorConverter(val);
    }
  });

  Object.defineProperty($scope, 'hairColor', {
    get: function () {
      return _hairColor
    },
    set: function (val) {
      _hairColor = val;
      $scope.dweller.hairColor = colorConverter(val);
    }
  });

  Object.defineProperty($scope, 'save', {
    get: function () {
      return _save
    },
    set: function (val) {
      _save = val;
      configureEquipmentEditor();
      configurePetEditor();
      configureCollectionEditor();
      $scope.dwellerFilters.outfitId = '';
      $scope.dwellerFilters.weaponId = '';
      $scope.dwellerFilters.petId = '';
      $scope.dwellerFilters.locationId = '';
      $scope.dwellerFilters.statusId = '';
      $scope.dwellerFilters.genderId = '';
      $scope.bulkDwellerSelection = {};
      $scope.bulkDwellerCount = 0;
      $scope.bulkDwellerEdit.outfitId = '';
      $scope.bulkDwellerEdit.weaponId = '';
      $scope.bulkDwellerEdit.petId = '';
      refreshDwellerEquipmentFilters();
      refreshSurvivalGuideDwellers();
      extractCount();
      extractTeams();
    }
  });

  Object.defineProperty($scope, 'lunchboxCount', {
    get: function () {
      return _lunchboxCount
    },
    set: function (val) {
      _lunchboxCount = val;
      updateCount();
    }
  });

  Object.defineProperty($scope, 'handyCount', {
    get: function () {
      return _handyCount
    },
    set: function (val) {
      _handyCount = val;
      updateCount();
    }
  });

  Object.defineProperty($scope, 'petCarrierCount', {
    get: function () {
      return _petCarrierCount
    },
    set: function (val) {
      _petCarrierCount = val;
      updateCount();
    }
  });

  Object.defineProperty($scope, 'starterPackCount', {
    get: function () {
      return _starterPackCount
    },
    set: function (val) {
      _starterPackCount = val;
      updateCount();
    }
  });

  Object.defineProperty($scope, 'elapsedTimeAliveExploring', {
    get: function () {
      return $scope.team.elapsedTimeAliveExploring;
    },
    set: function (val) {
      $scope.team.elapsedTimeAliveExploring = val;
      updateTeam();
    }
  });

  Object.defineProperty($scope, 'returnTripDuration', {
    get: function () {
      return $scope.team.returnTripDuration;
    },
    set: function (val) {
      $scope.team.returnTripDuration = val;
      updateTeam();
    }
  });

  Object.defineProperty($scope, 'teamEquipment', {
    get: function () {
      return $scope.team.teamEquipment;
    },
    set: function (val) {
      $scope.team.teamEquipment = val;
      updateTeam();
    }
  });


  $scope.editDweller = function (dweller) {
    $scope.dweller = dweller;
    $scope.dwellerPetId = dweller.equippedPet && dweller.equippedPet.type === "Pet"
      ? dweller.equippedPet.id
      : '';
    _firstName = $scope.dweller.name;
    _skinColor = colorConverter($scope.dweller.skinColor, true);
    _hairColor = colorConverter($scope.dweller.hairColor, true);
    setTimeout(colorHack, 200);
  };

  function equipmentId(dweller, fieldName) {
    var equipment = dweller && dweller[fieldName];
    return equipment && equipment.id ? equipment.id : '';
  }

  function buildEquippedOptions(dwellers, fieldName, names, emptyName) {
    var counts = {};
    var options = [];

    for (var dwellerIndex = 0; dwellerIndex < dwellers.length; dwellerIndex++) {
      var id = equipmentId(dwellers[dwellerIndex], fieldName);
      counts[id] = (counts[id] || 0) + 1;
    }

    Object.keys(counts).forEach(function (id) {
      var name = names[id] || (id ? id : emptyName);
      options.push({
        id: id,
        name: name,
        count: counts[id],
        label: name + " (" + counts[id] + ")"
      });
    });

    options.sort(function (left, right) {
      return left.name.localeCompare(right.name);
    });

    return options;
  }

  function equipmentAlphabeticalGroup(name) {
    var firstCharacter = String(name || '').trim().charAt(0).toUpperCase();

    if (firstCharacter >= 'A' && firstCharacter <= 'E') {
      return 'A–E';
    }
    if (firstCharacter >= 'F' && firstCharacter <= 'J') {
      return 'F–J';
    }
    if (firstCharacter >= 'K' && firstCharacter <= 'O') {
      return 'K–O';
    }
    if (firstCharacter >= 'P' && firstCharacter <= 'T') {
      return 'P–T';
    }
    if (firstCharacter >= 'U' && firstCharacter <= 'Z') {
      return 'U–Z';
    }

    return '#';
  }

  function equipmentRarityGroup(rarity) {
    if (rarity === 'Normal' || rarity === 'Common') {
      return 'Common';
    }
    if (rarity === 'Rare' || rarity === 'Legendary') {
      return rarity;
    }

    return 'Other';
  }

  function outfitBonusLabel(definition) {
    var statOrder = ['S', 'P', 'E', 'C', 'I', 'A', 'L'];
    var bonuses = definition && definition.special ? definition.special : {};
    var labels = [];

    for (var statIndex = 0; statIndex < statOrder.length; statIndex++) {
      var stat = statOrder[statIndex];
      var value = Number(bonuses[stat] || 0);
      if (value) {
        labels.push(stat + (value > 0 ? '+' : '') + value);
      }
    }

    return labels.length ? labels.join(' ') : 'No SPECIAL bonus';
  }

  function equipmentDetailLabel(name, definition, equipmentType) {
    if (!definition) {
      return name;
    }

    if (equipmentType === 'weapon') {
      return name + ' — ' + definition.damageMin + '–' + definition.damageMax + ' damage';
    }

    return name + ' — ' + outfitBonusLabel(definition);
  }

  function buildEquipmentSelectionOptions(equipmentNames, definitions, equipmentType) {
    var options = Object.keys(equipmentNames || {}).map(function (id) {
      var name = equipmentNames[id] || id;
      var definition = definitions && definitions[id];

      return {
        id: id,
        name: name,
        label: equipmentDetailLabel(name, definition, equipmentType),
        group: definition
          ? equipmentRarityGroup(definition.rarity)
          : equipmentAlphabeticalGroup(name)
      };
    });

    options.sort(function (left, right) {
      var rarityOrder = {
        Common: 0,
        Rare: 1,
        Legendary: 2,
        Other: 3
      };
      var leftRarityOrder = rarityOrder[left.group];
      var rightRarityOrder = rarityOrder[right.group];

      if (leftRarityOrder !== undefined && rightRarityOrder !== undefined
        && leftRarityOrder !== rightRarityOrder) {
        return leftRarityOrder - rightRarityOrder;
      }

      var nameDifference = left.name.localeCompare(right.name);
      return nameDifference || left.id.localeCompare(right.id);
    });

    return options;
  }

  function equipmentCatalogNames(fallbackNames, definitions) {
    var ids = Object.keys(definitions || {});
    var catalogNames = {};

    if (!ids.length) {
      return fallbackNames || {};
    }

    for (var idIndex = 0; idIndex < ids.length; idIndex++) {
      var id = ids[idIndex];
      var definition = definitions[id];

      if (!definition || !definition.name) {
        return fallbackNames || {};
      }

      catalogNames[id] = definition.name;
    }

    return catalogNames;
  }

  function currentOutfitNames() {
    return equipmentCatalogNames(
      $scope.dwelleroutfitslist,
      $scope.equipmentEditor.outfits
    );
  }

  function currentWeaponNames() {
    return equipmentCatalogNames(
      $scope.dwellerweaponlist,
      $scope.equipmentEditor.weapons
    );
  }

  function refreshEquipmentSelectionOptions() {
    $scope.dwellerOutfitOptions = buildEquipmentSelectionOptions(
      currentOutfitNames(),
      $scope.equipmentEditor.outfits,
      'outfit'
    );
    $scope.dwellerWeaponOptions = buildEquipmentSelectionOptions(
      currentWeaponNames(),
      $scope.equipmentEditor.weapons,
      'weapon'
    );
  }

  function equippedPetId(dweller) {
    return dweller && dweller.equippedPet && dweller.equippedPet.type === "Pet"
      ? dweller.equippedPet.id
      : "__no_pet__";
  }

  function buildEquippedPetOptions(dwellers) {
    var counts = {};
    var fallbackNames = {};
    var options = [];

    for (var dwellerIndex = 0; dwellerIndex < dwellers.length; dwellerIndex++) {
      var id = equippedPetId(dwellers[dwellerIndex]);
      var pet = dwellers[dwellerIndex].equippedPet;
      counts[id] = (counts[id] || 0) + 1;

      if (pet && pet.extraData && pet.extraData.uniqueName) {
        fallbackNames[id] = pet.extraData.uniqueName;
      }
    }

    Object.keys(counts).forEach(function (id) {
      var definition = $scope.petEditor.catalog[id];
      var name = id === "__no_pet__"
        ? "No Pet"
        : (definition ? definition.name : (fallbackNames[id] || id));

      if (definition) {
        name += " — " + definition.rarity;
      }

      options.push({
        id: id,
        name: name,
        count: counts[id],
        label: name + " (" + counts[id] + ")"
      });
    });

    options.sort(function (left, right) {
      if (left.id === "__no_pet__") {
        return -1;
      }
      if (right.id === "__no_pet__") {
        return 1;
      }
      return left.name.localeCompare(right.name);
    });

    return options;
  }

  function roomLocationId(room) {
    return "room:" + room.deserializeID;
  }

  function roomLocationName(room) {
    return room.type + " · Row " + room.row + " · Col " + room.col
      + " · " + room.mergeLevel + "-wide";
  }

  function growthRemainingLabel(task, taskManagerTime) {
    if (!task) {
      return "Unknown (growth task not found)";
    }

    var remainingSeconds = task.paused && isFinite(task.pausedRemainingTime)
      ? task.pausedRemainingTime
      : task.endTime - taskManagerTime;

    if (!isFinite(remainingSeconds)) {
      return "Unknown";
    }

    if (remainingSeconds <= 0) {
      return "Ready to grow up in game";
    }

    var totalMinutes = Math.ceil(remainingSeconds / 60);
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    var label = hours ? hours + "h " : "";
    label += minutes + "m";
    return label + " (at save time)";
  }

  function buildDwellerLocationOptions(dwellers) {
    var rooms = _save && _save.vault && _save.vault.rooms ? _save.vault.rooms : [];
    var teams = _save && _save.vault && _save.vault.wasteland && _save.vault.wasteland.teams
      ? _save.vault.wasteland.teams
      : [];
    var roomsById = {};
    var tasksById = {};
    var locations = {};
    var options = [];
    var taskManager = _save && _save.taskMgr ? _save.taskMgr : {};
    var tasks = (taskManager.tasks || []).concat(taskManager.pausedTasks || []);

    _dwellerLocationById = {};
    _dwellerLocationLabels = {};
    _dwellerChildById = {};
    _dwellerGrowthLabels = {};

    for (var taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
      tasksById[String(tasks[taskIndex].id)] = tasks[taskIndex];
    }

    for (var roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
      var room = rooms[roomIndex];
      var locationId = roomLocationId(room);
      roomsById[String(room.deserializeID)] = room;
      locations[locationId] = {
        id: locationId,
        name: roomLocationName(room),
        group: "Row " + room.row,
        row: room.row,
        col: room.col,
        count: 0
      };

      var roomDwellers = room.dwellers || [];
      for (var roomDwellerIndex = 0; roomDwellerIndex < roomDwellers.length; roomDwellerIndex++) {
        _dwellerLocationById[String(roomDwellers[roomDwellerIndex])] = locationId;
      }

      var roomChildren = room.children || [];
      for (var childIndex = 0; childIndex < roomChildren.length; childIndex++) {
        var child = roomChildren[childIndex];
        var childKey = String(child.dwellerID);
        _dwellerLocationById[childKey] = locationId;
        _dwellerChildById[childKey] = true;
        _dwellerGrowthLabels[childKey] = growthRemainingLabel(
          tasksById[String(child.taskID)],
          taskManager.time
        );
      }
    }

    for (var teamIndex = 0; teamIndex < teams.length; teamIndex++) {
      var teamDwellers = teams[teamIndex].dwellers || [];
      for (var teamDwellerIndex = 0; teamDwellerIndex < teamDwellers.length; teamDwellerIndex++) {
        _dwellerLocationById[String(teamDwellers[teamDwellerIndex])] = "__wasteland__";
      }
    }

    for (var dwellerIndex = 0; dwellerIndex < dwellers.length; dwellerIndex++) {
      var dweller = dwellers[dwellerIndex];
      var dwellerKey = String(dweller.serializeId);
      var dwellerLocationId = _dwellerLocationById[dwellerKey];

      if (!dwellerLocationId && roomsById[String(dweller.savedRoom)]) {
        dwellerLocationId = roomLocationId(roomsById[String(dweller.savedRoom)]);
      }

      if (!dwellerLocationId) {
        dwellerLocationId = "__unassigned__";
      }

      _dwellerLocationById[dwellerKey] = dwellerLocationId;

      if (!locations[dwellerLocationId]) {
        locations[dwellerLocationId] = {
          id: dwellerLocationId,
          name: dwellerLocationId === "__wasteland__" ? "Wasteland / Quest" : "Coffee Break / Unassigned",
          group: "Other",
          row: 999999,
          col: dwellerLocationId === "__wasteland__" ? 0 : 1,
          count: 0
        };
      }

      locations[dwellerLocationId].count++;
    }

    Object.keys(locations).forEach(function (locationId) {
      var location = locations[locationId];
      if (!location.count) {
        return;
      }

      _dwellerLocationLabels[locationId] = location.name;
      options.push({
        id: location.id,
        name: location.name,
        group: location.group,
        row: location.row,
        col: location.col,
        count: location.count,
        label: location.name + " (" + location.count + ")"
      });
    });

    options.sort(function (left, right) {
      if (left.row !== right.row) {
        return left.row - right.row;
      }
      if (left.col !== right.col) {
        return left.col - right.col;
      }
      return left.name.localeCompare(right.name);
    });

    return options;
  }

  function dwellerLocationId(dweller) {
    return dweller ? (_dwellerLocationById[String(dweller.serializeId)] || "__unassigned__") : "__unassigned__";
  }

  $scope.dwellerLocationLabel = function (dweller) {
    var locationId = dwellerLocationId(dweller);
    return _dwellerLocationLabels[locationId]
      || (locationId === "__wasteland__" ? "Wasteland / Quest" : "Coffee Break / Unassigned");
  };

  $scope.isChildDweller = function (dweller) {
    return !!(dweller && _dwellerChildById[String(dweller.serializeId)]);
  };

  $scope.dwellerLifeStageLabel = function (dweller) {
    return $scope.isChildDweller(dweller) ? "Child" : "Adult";
  };

  $scope.dwellerGrowthRemainingLabel = function (dweller) {
    return dweller
      ? (_dwellerGrowthLabels[String(dweller.serializeId)] || "Unknown")
      : "Unknown";
  };

  $scope.vaultStatistics = function () {
    var stats = {
      totalDwellers: 0,
      femaleDwellers: 0,
      maleDwellers: 0,
      unknownGenderDwellers: 0,
      adultDwellers: 0,
      childDwellers: 0,
      pregnantDwellers: 0,
      babyReadyDwellers: 0,
      roomDwellers: 0,
      wastelandDwellers: 0,
      unassignedDwellers: 0,
      awaitingDwellers: 0,
      equippedPets: 0,
      mrHandies: 0
    };
    var dwellers = $scope.save && $scope.save.dwellers
      && Array.isArray($scope.save.dwellers.dwellers)
      ? $scope.save.dwellers.dwellers
      : [];
    var actors = $scope.save && $scope.save.dwellers
      && Array.isArray($scope.save.dwellers.actors)
      ? $scope.save.dwellers.actors
      : [];

    stats.totalDwellers = dwellers.length;

    for (var dwellerIndex = 0; dwellerIndex < dwellers.length; dwellerIndex++) {
      var dweller = dwellers[dwellerIndex];
      var locationId = dwellerLocationId(dweller);

      if (dweller.gender === 1) {
        stats.femaleDwellers++;
      }
      else if (dweller.gender === 2) {
        stats.maleDwellers++;
      }
      else {
        stats.unknownGenderDwellers++;
      }

      if ($scope.isChildDweller(dweller)) {
        stats.childDwellers++;
      }
      else {
        stats.adultDwellers++;
      }

      if (dweller.pregnant) {
        stats.pregnantDwellers++;
      }
      if (dweller.babyReady) {
        stats.babyReadyDwellers++;
      }
      if (dweller.equippedPet && dweller.equippedPet.id) {
        stats.equippedPets++;
      }

      if (locationId === "__wasteland__") {
        stats.wastelandDwellers++;
      }
      else if (locationId.indexOf("room:") === 0) {
        stats.roomDwellers++;
      }
      else {
        stats.unassignedDwellers++;
      }
    }

    stats.awaitingDwellers = waitingDwellers().filter(isWaitingDweller).length;

    for (var actorIndex = 0; actorIndex < actors.length; actorIndex++) {
      if (isMrHandy(actors[actorIndex])) {
        stats.mrHandies++;
      }
    }

    return stats;
  };

  function optionExists(options, id) {
    for (var optionIndex = 0; optionIndex < options.length; optionIndex++) {
      if (options[optionIndex].id === id) {
        return true;
      }
    }

    return false;
  }

  function refreshDwellerEquipmentFilters() {
    var dwellers = _save && _save.dwellers && _save.dwellers.dwellers
      ? _save.dwellers.dwellers
      : [];

    $scope.dwellerFilters.outfits = buildEquippedOptions(
      dwellers,
      "equipedOutfit",
      currentOutfitNames(),
      "No Outfit"
    );
    $scope.dwellerFilters.weapons = buildEquippedOptions(
      dwellers,
      "equipedWeapon",
      currentWeaponNames(),
      "No Weapon"
    );
    $scope.dwellerFilters.pets = buildEquippedPetOptions(dwellers);
    $scope.dwellerFilters.locations = buildDwellerLocationOptions(dwellers);

    if ($scope.dwellerFilters.outfitId
      && !optionExists($scope.dwellerFilters.outfits, $scope.dwellerFilters.outfitId)) {
      $scope.dwellerFilters.outfitId = '';
    }

    if ($scope.dwellerFilters.weaponId
      && !optionExists($scope.dwellerFilters.weapons, $scope.dwellerFilters.weaponId)) {
      $scope.dwellerFilters.weaponId = '';
    }

    if ($scope.dwellerFilters.petId
      && !optionExists($scope.dwellerFilters.pets, $scope.dwellerFilters.petId)) {
      $scope.dwellerFilters.petId = '';
    }

    if ($scope.dwellerFilters.locationId
      && !optionExists($scope.dwellerFilters.locations, $scope.dwellerFilters.locationId)) {
      $scope.dwellerFilters.locationId = '';
    }
  }

  $scope.refreshDwellerEquipmentFilters = refreshDwellerEquipmentFilters;

  $scope.filterDwellerByEquipment = function (dweller) {
    var statusId = $scope.dwellerFilters.statusId;
    var statusMatches = !statusId
      || (statusId === "pregnant" && dweller.pregnant === true)
      || (statusId === "babyReady" && dweller.babyReady === true)
      || (statusId === "child" && $scope.isChildDweller(dweller))
      || (statusId === "adult" && !$scope.isChildDweller(dweller));

    return (!$scope.dwellerFilters.outfitId
      || equipmentId(dweller, "equipedOutfit") === $scope.dwellerFilters.outfitId)
      && (!$scope.dwellerFilters.weaponId
        || equipmentId(dweller, "equipedWeapon") === $scope.dwellerFilters.weaponId)
      && (!$scope.dwellerFilters.petId
        || equippedPetId(dweller) === $scope.dwellerFilters.petId)
      && (!$scope.dwellerFilters.locationId
        || dwellerLocationId(dweller) === $scope.dwellerFilters.locationId)
      && (!$scope.dwellerFilters.genderId
        || String(dweller.gender) === $scope.dwellerFilters.genderId)
      && statusMatches;
  };

  $scope.clearDwellerEquipmentFilters = function () {
    $scope.dwellerFilters.outfitId = '';
    $scope.dwellerFilters.weaponId = '';
    $scope.dwellerFilters.petId = '';
    $scope.dwellerFilters.locationId = '';
    $scope.dwellerFilters.statusId = '';
    $scope.dwellerFilters.genderId = '';
  };

  function selectedBulkDwellers() {
    var dwellers = _save && _save.dwellers && _save.dwellers.dwellers
      ? _save.dwellers.dwellers
      : [];

    return dwellers.filter(function (dweller) {
      return !!$scope.bulkDwellerSelection[String(dweller.serializeId)];
    });
  }

  $scope.updateBulkDwellerSelection = function () {
    $scope.bulkDwellerCount = selectedBulkDwellers().length;
  };

  $scope.selectFilteredDwellers = function () {
    var dwellers = $scope.filteredDwellers || [];

    for (var dwellerIndex = 0; dwellerIndex < dwellers.length; dwellerIndex++) {
      if (!$scope.isChildDweller(dwellers[dwellerIndex])) {
        $scope.bulkDwellerSelection[String(dwellers[dwellerIndex].serializeId)] = true;
      }
    }

    $scope.updateBulkDwellerSelection();
  };

  $scope.clearBulkDwellerSelection = function () {
    $scope.bulkDwellerSelection = {};
    $scope.bulkDwellerCount = 0;
    $scope.bulkDwellerEdit.outfitId = '';
    $scope.bulkDwellerEdit.weaponId = '';
    $scope.bulkDwellerEdit.petId = '';
  };

  $scope.hasBulkDwellerChanges = function () {
    return !!($scope.bulkDwellerEdit.outfitId
      || $scope.bulkDwellerEdit.weaponId
      || $scope.bulkDwellerEdit.petId);
  };

  function storageItems() {
    var vault = $scope.save && $scope.save.vault;
    var inventory = vault && vault.inventory;

    return inventory && Array.isArray(inventory.items) ? inventory.items : [];
  }

  $scope.storageItemCount = function () {
    return storageItems().length;
  };

  function countItemsByType(items) {
    var counts = {};

    for (var itemIndex = 0; itemIndex < items.length; itemIndex++) {
      var itemType = items[itemIndex] && items[itemIndex].type
        ? items[itemIndex].type
        : "Other";
      counts[itemType] = (counts[itemType] || 0) + 1;
    }

    return counts;
  }

  function itemCountSummary(counts) {
    var preferredOrder = ["Outfit", "Weapon", "Pet", "Junk", "Other"];
    var parts = [];

    for (var typeIndex = 0; typeIndex < preferredOrder.length; typeIndex++) {
      var itemType = preferredOrder[typeIndex];
      if (counts[itemType]) {
        parts.push(itemType + ": " + counts[itemType]);
      }
    }

    Object.keys(counts).sort().forEach(function (itemType) {
      if (preferredOrder.indexOf(itemType) === -1) {
        parts.push(itemType + ": " + counts[itemType]);
      }
    });

    return parts.join(", ");
  }

  $scope.clearStorage = function () {
    var items = storageItems();
    var itemCount = items.length;

    if (!itemCount) {
      alert("Storage is already empty.");
      return;
    }

    var summary = itemCountSummary(countItemsByType(items));
    var warning = "Permanently remove all " + itemCount + " unassigned Storage items?\n\n"
      + summary + "\n\n"
      + "Equipped items, resources, recipes, and Survival Guide progress will not be changed.";

    if (!window.confirm(warning)) {
      return;
    }

    if (!window.confirm("Final confirmation: Clear all " + itemCount
      + " Storage items from the loaded save? This cannot be undone after downloading the save.")) {
      return;
    }

    items.splice(0, items.length);
    alert("Cleared " + itemCount + " Storage items. Use Save to download the modified file.");
  };

  function setDwellerEquipment(dweller, fieldName, itemId, itemType) {
    if (!dweller[fieldName]) {
      dweller[fieldName] = {
        id: itemId,
        type: itemType,
        hasBeenAssigned: false,
        hasRandonWeaponBeenAssigned: false
      };
      return;
    }

    dweller[fieldName].id = itemId;
    dweller[fieldName].type = itemType;
  }

  $scope.applyBulkDwellerEdit = function () {
    var dwellers = selectedBulkDwellers();
    var outfitId = $scope.bulkDwellerEdit.outfitId;
    var weaponId = $scope.bulkDwellerEdit.weaponId;
    var petId = $scope.bulkDwellerEdit.petId;
    var changeNames = [];

    if (!dwellers.length || !$scope.hasBulkDwellerChanges()) {
      return;
    }

    if (petId && petId !== "__remove_pet__"
      && (!$scope.petEditor.ready || !$scope.petEditor.catalog[petId])) {
      alert("The selected Pet is not available for this save version.");
      return;
    }

    if (outfitId) {
      changeNames.push("Outfit");
    }
    if (weaponId) {
      changeNames.push("Weapon");
    }
    if (petId) {
      changeNames.push("Pet");
    }

    if (!window.confirm("Apply " + changeNames.join(", ") + " changes to "
      + dwellers.length + " selected dwellers?")) {
      return;
    }

    for (var dwellerIndex = 0; dwellerIndex < dwellers.length; dwellerIndex++) {
      if (outfitId) {
        setDwellerEquipment(dwellers[dwellerIndex], "equipedOutfit", outfitId, "Outfit");
      }
      if (weaponId) {
        setDwellerEquipment(dwellers[dwellerIndex], "equipedWeapon", weaponId, "Weapon");
      }
      if (petId) {
        setDwellerPet(dwellers[dwellerIndex], petId === "__remove_pet__" ? '' : petId);
      }
    }

    refreshDwellerEquipmentFilters();
    $scope.clearBulkDwellerSelection();
    alert("Updated " + dwellers.length + " dwellers.");
  };

  function dwellerIsInActiveTeam(dwellerId) {
    var wasteland = $scope.save && $scope.save.vault && $scope.save.vault.wasteland;
    var teams = wasteland && Array.isArray(wasteland.teams) ? wasteland.teams : [];

    for (var teamIndex = 0; teamIndex < teams.length; teamIndex++) {
      var teamDwellers = Array.isArray(teams[teamIndex].dwellers)
        ? teams[teamIndex].dwellers
        : [];
      if (teamDwellers.indexOf(dwellerId) !== -1) {
        return true;
      }
    }

    return false;
  }

  function isLegendaryDweller(dweller) {
    return !!(dweller && String(dweller.rarity || '').toLowerCase() === "legendary");
  }

  function refreshSurvivalGuideDwellers() {
    var collectedDwellers = $scope.save && $scope.save.survivalW
      && Array.isArray($scope.save.survivalW.dwellers)
      ? $scope.save.survivalW.dwellers
      : [];
    var seen = {};

    $scope.survivalGuideDwellers = collectedDwellers.filter(function (guideId) {
      var key = String(guideId);
      if (seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    }).map(function (guideId) {
      var id = String(guideId);
      return {
        id: id,
        name: $scope.collectionEditor.names[id] || id.replace(/^OL_/, '')
      };
    }).sort(function (left, right) {
      return left.name.localeCompare(right.name);
    });
  }

  function configureCollectionEditor() {
    var version = normalizeAppVersion(_save);
    var catalogUrl = COLLECTION_DWELLER_CATALOG_URLS[version];

    $scope.collectionEditor.saveVersion = version;
    $scope.collectionEditor.supported = !!catalogUrl;
    $scope.collectionEditor.loading = false;
    $scope.collectionEditor.ready = false;
    $scope.collectionEditor.error = '';
    $scope.collectionEditor.names = {};

    if (!catalogUrl) {
      return;
    }

    $scope.collectionEditor.loading = true;
    $http.get(catalogUrl, { cache: true }).then(function (response) {
      if (normalizeAppVersion(_save) !== version) {
        return;
      }

      var data = response.data || {};
      var dwellers = data.dwellers || [];
      var names = {};

      if (String(data.appVersion || '').trim() !== version) {
        throw new Error("The Dweller collection catalog version does not match the loaded save.");
      }

      for (var dwellerIndex = 0; dwellerIndex < dwellers.length; dwellerIndex++) {
        names[dwellers[dwellerIndex].id] = dwellers[dwellerIndex].name;
      }

      if (!dwellers.length) {
        throw new Error("The Dweller collection catalog is empty.");
      }

      $scope.collectionEditor.names = names;
      $scope.collectionEditor.loading = false;
      $scope.collectionEditor.ready = true;
      refreshSurvivalGuideDwellers();
    }).catch(function (error) {
      if (normalizeAppVersion(_save) !== version) {
        return;
      }

      $scope.collectionEditor.loading = false;
      $scope.collectionEditor.ready = false;
      $scope.collectionEditor.error = error && error.message
        ? error.message
        : "The Dweller collection catalog could not be loaded.";
      refreshSurvivalGuideDwellers();
    });
  }

  function legendarySurvivalGuideId(dweller) {
    var uniqueData = dweller && dweller.uniqueData ? String(dweller.uniqueData) : '';
    return uniqueData.indexOf("L_") === 0 ? "O" + uniqueData : '';
  }

  function legendaryIsRegisteredInSurvivalGuide(dweller) {
    if (!isLegendaryDweller(dweller)) {
      return true;
    }

    var guideId = legendarySurvivalGuideId(dweller);
    var collectedDwellers = $scope.save && $scope.save.survivalW
      && Array.isArray($scope.save.survivalW.dwellers)
      ? $scope.save.survivalW.dwellers
      : [];
    return !!guideId && collectedDwellers.indexOf(guideId) !== -1;
  }

  $scope.bulkSelectedLegendarySummary = function () {
    return selectedBulkDwellers().filter(isLegendaryDweller).map(function (dweller) {
      var name = [dweller.name, dweller.lastName].filter(Boolean).join(" ");
      return name + (legendaryIsRegisteredInSurvivalGuide(dweller)
        ? " — Registered"
        : " — NOT registered (protected)");
    }).sort().join(", ");
  };

  function dwellerEvictionBlockReason(dweller) {
    if ($scope.isChildDweller(dweller)) {
      return "Child";
    }
    if (dweller.pregnant) {
      return "Pregnant";
    }
    if (dweller.babyReady) {
      return "Baby Ready";
    }
    if (dwellerIsInActiveTeam(dweller.serializeId)) {
      return "Wasteland / Quest";
    }
    if (!legendaryIsRegisteredInSurvivalGuide(dweller)) {
      return "Legendary not in Survival Guide";
    }

    return '';
  }

  function bulkEvictionPartition() {
    var selected = selectedBulkDwellers();
    var eligible = [];
    var blocked = [];

    for (var dwellerIndex = 0; dwellerIndex < selected.length; dwellerIndex++) {
      var reason = dwellerEvictionBlockReason(selected[dwellerIndex]);
      if (reason) {
        blocked.push({
          dweller: selected[dwellerIndex],
          reason: reason
        });
      }
      else {
        eligible.push(selected[dwellerIndex]);
      }
    }

    return {
      eligible: eligible,
      blocked: blocked
    };
  }

  $scope.bulkEvictableDwellerCount = function () {
    return bulkEvictionPartition().eligible.length;
  };

  $scope.bulkBlockedDwellerCount = function () {
    return bulkEvictionPartition().blocked.length;
  };

  function cloneInventoryItem(item) {
    return JSON.parse(JSON.stringify(item));
  }

  function returnDwellerItemsToStorage(dwellers) {
    var vault = $scope.save.vault;
    if (!vault.inventory) {
      vault.inventory = { items: [] };
    }
    if (!Array.isArray(vault.inventory.items)) {
      vault.inventory.items = [];
    }

    var items = vault.inventory.items;
    var returned = 0;

    for (var dwellerIndex = 0; dwellerIndex < dwellers.length; dwellerIndex++) {
      var dweller = dwellers[dwellerIndex];
      var outfit = dweller.equipedOutfit;
      var weapon = dweller.equipedWeapon;
      var pet = dweller.equippedPet;

      if (outfit && outfit.id && outfit.id !== "jumpsuit") {
        items.push(cloneInventoryItem(outfit));
        returned++;
      }
      if (weapon && weapon.id && weapon.id !== "Fist") {
        items.push(cloneInventoryItem(weapon));
        returned++;
      }
      if (pet && pet.id && pet.type === "Pet") {
        items.push(cloneInventoryItem(pet));
        returned++;
      }
    }

    return returned;
  }

  function evictionIdMap(dwellers) {
    var ids = {};
    for (var dwellerIndex = 0; dwellerIndex < dwellers.length; dwellerIndex++) {
      ids[String(dwellers[dwellerIndex].serializeId)] = true;
    }
    return ids;
  }

  function containsEvictionId(ids, value) {
    return value !== undefined && value !== null && !!ids[String(value)];
  }

  function scrubEvictedDwellerReferences(dwellers) {
    var ids = evictionIdMap(dwellers);
    var orphanTaskIds = {};
    var save = $scope.save;
    var rooms = save.vault && Array.isArray(save.vault.rooms) ? save.vault.rooms : [];

    function rememberTask(taskId) {
      if (typeof taskId === "number" && taskId > 0) {
        orphanTaskIds[String(taskId)] = true;
      }
    }

    for (var roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
      var room = rooms[roomIndex];

      if (Array.isArray(room.dwellers)) {
        room.dwellers = room.dwellers.filter(function (dwellerId) {
          return !containsEvictionId(ids, dwellerId);
        });
      }
      if (Array.isArray(room.deadDwellers)) {
        room.deadDwellers = room.deadDwellers.filter(function (dwellerId) {
          return !containsEvictionId(ids, dwellerId);
        });
      }
      if (Array.isArray(room.slots)) {
        for (var slotIndex = 0; slotIndex < room.slots.length; slotIndex++) {
          var slot = room.slots[slotIndex];
          if (containsEvictionId(ids, slot.dwellerID)) {
            rememberTask(slot.taskID);
            slot.dwellerID = -2;
            slot.taskID = -2;
          }
        }
      }
      if (Array.isArray(room.partners)) {
        var survivingPartners = [];
        for (var partnerIndex = 0; partnerIndex < room.partners.length; partnerIndex++) {
          var partnership = room.partners[partnerIndex];
          if (containsEvictionId(ids, partnership.f)) {
            rememberTask(partnership.t);
            continue;
          }
          if (containsEvictionId(ids, partnership.fatherId)) {
            partnership.fatherId = -1;
          }
          if (containsEvictionId(ids, partnership.templateID)) {
            partnership.templateID = -1;
          }
          survivingPartners.push(partnership);
        }
        room.partners = survivingPartners;
      }
      if (Array.isArray(room.children)) {
        room.children = room.children.filter(function (child) {
          if (containsEvictionId(ids, child.dwellerID)) {
            rememberTask(child.taskID);
            return false;
          }
          return true;
        });
      }
    }

    var wasteland = save.vault && save.vault.wasteland;
    var teams = wasteland && Array.isArray(wasteland.teams) ? wasteland.teams : [];
    for (var teamIndex = teams.length - 1; teamIndex >= 0; teamIndex--) {
      var team = teams[teamIndex];
      if (!Array.isArray(team.dwellers)) {
        continue;
      }
      team.dwellers = team.dwellers.filter(function (dwellerId) {
        return !containsEvictionId(ids, dwellerId);
      });
      if (!team.dwellers.length && (!Array.isArray(team.actors) || !team.actors.length)) {
        teams.splice(teamIndex, 1);
      }
    }

    var spawner = save.dwellerSpawner;
    if (spawner && Array.isArray(spawner.dwellersWaiting)) {
      spawner.dwellersWaiting = spawner.dwellersWaiting.filter(function (waiting) {
        return !waiting || !containsEvictionId(ids, waiting.dwellerId);
      });
    }

    var actors = save.dwellers && Array.isArray(save.dwellers.actors)
      ? save.dwellers.actors
      : [];
    var removedActorIds = [];
    for (var actorIndex = actors.length - 1; actorIndex >= 0; actorIndex--) {
      if (isPet(actors[actorIndex]) && containsEvictionId(ids, actors[actorIndex].FollowedID)) {
        removedActorIds.push(actors[actorIndex].serializeId);
        delete $scope.petEditor.editedActorIds[actors[actorIndex].serializeId];
        actors.splice(actorIndex, 1);
      }
    }
    removePetActorReferences(removedActorIds);

    var taskManager = save.taskMgr;
    if (taskManager) {
      ["tasks", "pausedTasks"].forEach(function (taskListName) {
        if (Array.isArray(taskManager[taskListName])) {
          taskManager[taskListName] = taskManager[taskListName].filter(function (task) {
            return !task || !orphanTaskIds[String(task.id)];
          });
        }
      });
    }

    save.dwellers.dwellers = save.dwellers.dwellers.filter(function (dweller) {
      return !containsEvictionId(ids, dweller.serializeId);
    });

    var vaultStats = save.StatsWindow && save.StatsWindow.vaultData;
    if (vaultStats) {
      var priorEvictions = parseInt(vaultStats.evictedDwellers, 10);
      vaultStats.evictedDwellers = (isFinite(priorEvictions) ? priorEvictions : 0) + dwellers.length;
    }

    return ids;
  }

  function blockedEvictionSummary(blocked) {
    var counts = {};
    for (var blockedIndex = 0; blockedIndex < blocked.length; blockedIndex++) {
      var reason = blocked[blockedIndex].reason;
      counts[reason] = (counts[reason] || 0) + 1;
    }
    return itemCountSummary(counts);
  }

  $scope.evictSelectedDwellers = function () {
    var partition = bulkEvictionPartition();
    var dwellers = partition.eligible;

    if (!dwellers.length) {
      alert("None of the selected Dwellers are eligible for eviction.");
      return;
    }

    var returnedItemCount = 0;
    for (var dwellerIndex = 0; dwellerIndex < dwellers.length; dwellerIndex++) {
      var dweller = dwellers[dwellerIndex];
      returnedItemCount += dweller.equipedOutfit && dweller.equipedOutfit.id
        && dweller.equipedOutfit.id !== "jumpsuit" ? 1 : 0;
      returnedItemCount += dweller.equipedWeapon && dweller.equipedWeapon.id
        && dweller.equipedWeapon.id !== "Fist" ? 1 : 0;
      returnedItemCount += dweller.equippedPet && dweller.equippedPet.id
        && dweller.equippedPet.type === "Pet" ? 1 : 0;
    }

    var warning = "Permanently evict " + dwellers.length + " selected Dwellers?\n\n"
      + returnedItemCount + " equipped items and Pets will be returned to Storage.";
    if (partition.blocked.length) {
      warning += "\n" + partition.blocked.length + " protected selections will be skipped ("
        + blockedEvictionSummary(partition.blocked) + ").";
    }
    warning += "\n\nRoom, training, family, task, door-queue, team, and Pet references will be cleaned.";

    if (!window.confirm(warning)) {
      return;
    }
    if (!window.confirm("Final confirmation: permanently evict " + dwellers.length
      + " Dwellers from the loaded save? This cannot be undone after downloading the save.")) {
      return;
    }

    returnDwellerItemsToStorage(dwellers);
    var removedIds = scrubEvictedDwellerReferences(dwellers);

    if ($scope.dweller && containsEvictionId(removedIds, $scope.dweller.serializeId)) {
      $scope.closeDweller();
    }

    $scope.clearBulkDwellerSelection();
    refreshDwellerEquipmentFilters();
    extractTeams();

    var result = "Evicted " + dwellers.length + " Dwellers and returned "
      + returnedItemCount + " equipped items and Pets to Storage.";
    if (partition.blocked.length) {
      result += " Skipped " + partition.blocked.length + " protected selections.";
    }
    alert(result + " Use Save to download the modified file.");
  };

  $scope.updateDwellerPregnancy = function () {
    if (!$scope.dweller.pregnant) {
      $scope.dweller.babyReady = false;
    }
  };

  $scope.editOthers = function (other) {
    $scope.other = other;
    _otherName = $scope.other.name;
    $scope.petOwner = isPet(other) ? findDweller(other.FollowedID) || {} : {};
    $scope.petItem = getEquippedPetForActor(other) || {};
    refreshSelectedPetDefinition();
  };

  function isMrHandy(other) {
    return other && other.characterType === 2;
  }

  function isPet(other) {
    return other && other.characterType === 3;
  }

  function getEquippedPetForActor(other) {
    if (!isPet(other)) {
      return null;
    }

    var owner = findDweller(other.FollowedID);
    if (!owner || !owner.equippedPet || owner.equippedPet.type !== "Pet") {
      return null;
    }

    if (owner.equippedPet.id !== other.actorDataId) {
      return null;
    }

    return owner.equippedPet;
  }

  $scope.petDisplayName = function (other) {
    var equippedPet = getEquippedPetForActor(other);
    var uniqueName = equippedPet && equippedPet.extraData
      ? equippedPet.extraData.uniqueName
      : '';
    var petId = equippedPet && equippedPet.id ? equippedPet.id : other && other.actorDataId;
    var definition = petId ? $scope.petEditor.catalog[petId] : null;

    return uniqueName || (definition && definition.name) || (other && other.name)
      || petId || "Unknown Pet";
  };

  function normalizeAppVersion(save) {
    if (!save || save.appVersion === undefined || save.appVersion === null) {
      return '';
    }

    return String(save.appVersion).trim();
  }

  function humanizePetBonus(bonus) {
    return String(bonus || '').replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  }

  function buildPetSelectionOptions(pets) {
    var rarityOrder = {
      Common: 0,
      Rare: 1,
      Legendary: 2,
      None: 3
    };
    var options = pets.map(function (pet) {
      return {
        id: pet.id,
        rarity: pet.rarity,
        name: pet.name,
        label: pet.name + " — " + humanizePetBonus(pet.bonus)
          + " (max " + pet.bonusMax + ")"
      };
    });

    options.sort(function (left, right) {
      var rarityDifference = (rarityOrder[left.rarity] || 0) - (rarityOrder[right.rarity] || 0);
      if (rarityDifference) {
        return rarityDifference;
      }

      var nameDifference = left.name.localeCompare(right.name);
      return nameDifference || left.id.localeCompare(right.id);
    });

    return options;
  }

  function configurePetEditor() {
    var version = normalizeAppVersion(_save);
    var catalogUrl = PET_CATALOG_URLS[version];

    $scope.petEditor.saveVersion = version;
    $scope.petEditor.supported = !!catalogUrl;
    $scope.petEditor.loading = false;
    $scope.petEditor.ready = false;
    $scope.petEditor.error = '';
    $scope.petEditor.catalog = {};
    $scope.petEditor.pets = [];
    $scope.bulkPetOptions = [];
    $scope.petEditor.editedActorIds = {};
    $scope.petDefinition = {};

    if (!catalogUrl) {
      return;
    }

    $scope.petEditor.loading = true;
    $http.get(catalogUrl, { cache: true }).then(function (response) {
      if (normalizeAppVersion(_save) !== version) {
        return;
      }

      var data = response.data || {};
      var pets = data.pets || [];
      var catalog = {};

      if (String(data.appVersion || '').trim() !== version) {
        throw new Error("The Pet catalog version does not match the loaded save.");
      }

      for (var petIndex = 0; petIndex < pets.length; petIndex++) {
        catalog[pets[petIndex].id] = pets[petIndex];
      }

      if (!pets.length) {
        throw new Error("The Pet catalog is empty.");
      }

      $scope.petEditor.catalog = catalog;
      $scope.petEditor.pets = buildPetSelectionOptions(pets);
      $scope.bulkPetOptions = [{
        id: "__remove_pet__",
        rarity: "Action",
        name: "Remove equipped Pet",
        label: "Remove equipped Pet"
      }].concat($scope.petEditor.pets);
      $scope.petEditor.loading = false;
      $scope.petEditor.ready = true;
      refreshSelectedPetDefinition();
      refreshDwellerEquipmentFilters();
    }).catch(function (error) {
      if (normalizeAppVersion(_save) !== version) {
        return;
      }

      $scope.petEditor.loading = false;
      $scope.petEditor.ready = false;
      $scope.petEditor.error = error && error.message
        ? error.message
        : "The Pet catalog could not be loaded.";
      refreshSelectedPetDefinition();
    });
  }

  function configureEquipmentEditor() {
    var version = normalizeAppVersion(_save);
    var catalogUrl = EQUIPMENT_CATALOG_URLS[version];

    $scope.equipmentEditor.saveVersion = version;
    $scope.equipmentEditor.supported = !!catalogUrl;
    $scope.equipmentEditor.loading = false;
    $scope.equipmentEditor.ready = false;
    $scope.equipmentEditor.error = '';
    $scope.equipmentEditor.outfits = {};
    $scope.equipmentEditor.weapons = {};
    refreshEquipmentSelectionOptions();

    if (!catalogUrl) {
      return;
    }

    $scope.equipmentEditor.loading = true;
    $http.get(catalogUrl, { cache: true }).then(function (response) {
      if (normalizeAppVersion(_save) !== version) {
        return;
      }

      var data = response.data || {};
      if (String(data.appVersion || '').trim() !== version) {
        throw new Error("The equipment catalog version does not match the loaded save.");
      }
      if (!data.outfits || !data.weapons) {
        throw new Error("The equipment catalog is incomplete.");
      }

      $scope.equipmentEditor.outfits = data.outfits;
      $scope.equipmentEditor.weapons = data.weapons;
      $scope.equipmentEditor.loading = false;
      $scope.equipmentEditor.ready = true;
      refreshEquipmentSelectionOptions();
      refreshDwellerEquipmentFilters();
    }).catch(function (error) {
      if (normalizeAppVersion(_save) !== version) {
        return;
      }

      $scope.equipmentEditor.loading = false;
      $scope.equipmentEditor.ready = false;
      $scope.equipmentEditor.error = error && error.message
        ? error.message
        : "The equipment catalog could not be loaded.";
      refreshEquipmentSelectionOptions();
      refreshDwellerEquipmentFilters();
    });
  }

  function refreshSelectedPetDefinition() {
    var petId = $scope.petItem && $scope.petItem.id;
    $scope.petDefinition = petId && $scope.petEditor.catalog[petId]
      ? $scope.petEditor.catalog[petId]
      : {};
  }

  function selectedPetMatchesCatalog() {
    return $scope.petDefinition.id
      && $scope.petItem
      && $scope.petItem.extraData
      && $scope.petItem.extraData.bonus === $scope.petDefinition.bonus;
  }

  function markSelectedPetEdited() {
    if (isPet($scope.other) && $scope.canEditSelectedPet && $scope.canEditSelectedPet()) {
      $scope.petEditor.editedActorIds[$scope.other.serializeId] = true;
    }
  }

  function validateEditedPets() {
    var actorIds = Object.keys($scope.petEditor.editedActorIds);

    for (var actorIndex = 0; actorIndex < actorIds.length; actorIndex++) {
      var actor = findActor(actorIds[actorIndex]);
      var pet = getEquippedPetForActor(actor);
      var definition = pet && $scope.petEditor.catalog[pet.id];
      var bonusValue = pet && pet.extraData && pet.extraData.bonusValue;

      if (!actor || !pet || !definition || pet.extraData.bonus !== definition.bonus) {
        return "An edited Pet no longer matches the Fallout Shelter "
          + ($scope.petEditor.saveVersion || "save version") + " catalog.";
      }

      if (typeof bonusValue !== "number" || !isFinite(bonusValue)
        || bonusValue < definition.bonusMin || bonusValue > definition.bonusMax) {
        return (actor.name || pet.id) + " has an invalid " + definition.bonus
          + " value. Enter a value from " + definition.bonusMin + " to " + definition.bonusMax + ".";
      }
    }

    return '';
  }

  $scope.canEditSelectedPet = function () {
    return $scope.petEditor.ready && selectedPetMatchesCatalog();
  };

  $scope.markPetEdited = markSelectedPetEdited;

  $scope.maxSelectedPetBonus = function () {
    if (!$scope.canEditSelectedPet()) {
      return;
    }

    $scope.petItem.extraData.bonusValue = $scope.petDefinition.bonusMax;
    markSelectedPetEdited();
  };

  function findPetActorForDweller(dwellerId) {
    var actors = $scope.save.dwellers.actors || [];

    for (var actorIndex = 0; actorIndex < actors.length; actorIndex++) {
      if (isPet(actors[actorIndex]) && actors[actorIndex].FollowedID == dwellerId) {
        return actors[actorIndex];
      }
    }

    return null;
  }

  function nextActorSerializeId() {
    var actors = $scope.save.dwellers.actors || [];
    var nextId = parseInt($scope.save.dwellers.mrhId, 10);

    if (!isFinite(nextId) || nextId < 1) {
      nextId = 1;
    }

    for (var actorIndex = 0; actorIndex < actors.length; actorIndex++) {
      nextId = Math.max(nextId, parseInt(actors[actorIndex].serializeId, 10) + 1);
    }

    while (findActor(nextId)) {
      nextId++;
    }

    $scope.save.dwellers.mrhId = nextId + 1;
    return nextId;
  }

  function emptyActorResources() {
    return {
      Nuka: 0,
      Food: 0,
      Energy: 0,
      Water: 0,
      StimPack: 0,
      RadAway: 0,
      Lunchbox: 0,
      MrHandy: 0,
      PetCarrier: 0,
      CraftedOutfit: 0,
      CraftedWeapon: 0,
      NukaColaQuantum: 0,
      CraftedTheme: 0
    };
  }

  function emptyActorEquipment() {
    return {
      storage: {
        resources: emptyActorResources(),
        bonus: emptyActorResources()
      },
      inventory: {
        items: []
      },
      dwellers: [],
      questClues: [],
      collectedThemes: {
        themeList: []
      }
    };
  }

  function createPetActor(dweller, definition) {
    return {
      characterType: 3,
      actorDataId: definition.id,
      serializeId: nextActorSerializeId(),
      name: definition.name,
      canCollect: false,
      willGoToWasteland: false,
      equipment: emptyActorEquipment(),
      health: 5000,
      death: false,
      savedRoom: typeof dweller.savedRoom === "number" ? dweller.savedRoom : -1,
      FollowedID: dweller.serializeId
    };
  }

  function removePetActorReferences(actorIds) {
    var wasteland = $scope.save.vault.wasteland || {};
    var teams = wasteland.teams || [];

    for (var teamIndex = 0; teamIndex < teams.length; teamIndex++) {
      var teamActors = teams[teamIndex].actors || [];

      for (var actorIndex = teamActors.length - 1; actorIndex >= 0; actorIndex--) {
        if (actorIds.indexOf(teamActors[actorIndex]) !== -1) {
          teamActors.splice(actorIndex, 1);
        }
      }
    }
  }

  function removeDwellerPet(dweller) {
    var actors = $scope.save.dwellers.actors || [];
    var removedActorIds = [];

    for (var actorIndex = actors.length - 1; actorIndex >= 0; actorIndex--) {
      if (isPet(actors[actorIndex]) && actors[actorIndex].FollowedID == dweller.serializeId) {
        removedActorIds.push(actors[actorIndex].serializeId);
        delete $scope.petEditor.editedActorIds[actors[actorIndex].serializeId];
        actors.splice(actorIndex, 1);
      }
    }

    removePetActorReferences(removedActorIds);
    delete dweller.equippedPet;

    if (Object.prototype.hasOwnProperty.call(dweller, "pet")) {
      delete dweller.pet;
    }

    if (removedActorIds.indexOf($scope.other.serializeId) !== -1) {
      $scope.closeOther();
    }
  }

  function setDwellerPet(dweller, petId) {
    if (!petId) {
      removeDwellerPet(dweller);
      return true;
    }

    var definition = $scope.petEditor.catalog[petId];
    if (!definition) {
      return false;
    }

    var actor = findPetActorForDweller(dweller.serializeId);
    if (!actor) {
      actor = createPetActor(dweller, definition);
      $scope.save.dwellers.actors.push(actor);
    }

    actor.actorDataId = definition.id;
    actor.name = definition.name;
    actor.FollowedID = dweller.serializeId;

    dweller.equippedPet = {
      id: definition.id,
      type: "Pet",
      hasBeenAssigned: false,
      hasRandonWeaponBeenAssigned: false,
      extraData: {
        uniqueName: definition.name,
        bonus: definition.bonus,
        bonusValue: definition.bonusMax
      }
    };

    if (Object.prototype.hasOwnProperty.call(dweller, "pet")) {
      delete dweller.pet;
    }

    $scope.petEditor.editedActorIds[actor.serializeId] = true;
    return true;
  }

  $scope.changeSelectedDwellerPet = function () {
    if (!$scope.petEditor.ready || !$scope.dweller || !$scope.dweller.serializeId) {
      return;
    }

    if (!setDwellerPet($scope.dweller, $scope.dwellerPetId)) {
      alert("This Pet is not present in the Fallout Shelter "
        + ($scope.petEditor.saveVersion || "save version") + " catalog.");
      $scope.dwellerPetId = equippedPetId($scope.dweller) === "__no_pet__"
        ? ''
        : equippedPetId($scope.dweller);
      return;
    }

    refreshDwellerEquipmentFilters();
  };

  function isActorInWasteland(actorId) {
    var wasteland = $scope.save.vault.wasteland || {};
    var teams = wasteland.teams || [];

    for (var teamIndex = 0; teamIndex < teams.length; teamIndex++) {
      if ((teams[teamIndex].actors || []).indexOf(actorId) !== -1) {
        return true;
      }
    }

    return false;
  }

  function deleteMrHandyIds(actorIds) {
    var actors = $scope.save.dwellers.actors;
    var rooms = $scope.save.vault.rooms || [];

    for (var roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
      var mrHandyList = rooms[roomIndex].mrHandyList;

      if (!Array.isArray(mrHandyList)) {
        continue;
      }

      for (var handyIndex = mrHandyList.length - 1; handyIndex >= 0; handyIndex--) {
        if (actorIds.indexOf(mrHandyList[handyIndex]) !== -1) {
          mrHandyList.splice(handyIndex, 1);
        }
      }
    }

    for (var actorIndex = actors.length - 1; actorIndex >= 0; actorIndex--) {
      if (actorIds.indexOf(actors[actorIndex].serializeId) !== -1) {
        actors.splice(actorIndex, 1);
      }
    }
  }

  $scope.isMrHandy = isMrHandy;
  $scope.isPet = isPet;

  $scope.isMrHandyInWasteland = function (other) {
    return isMrHandy(other) && isActorInWasteland(other.serializeId);
  };

  $scope.mrHandyLocationLabel = function (other) {
    if (!isMrHandy(other)) {
      return "";
    }

    var actorId = String(other.serializeId);
    var wasteland = $scope.save.vault.wasteland || {};
    var teams = wasteland.teams || [];
    var rooms = $scope.save.vault.rooms || [];
    var waiting = waitingDwellers();

    for (var teamIndex = 0; teamIndex < teams.length; teamIndex++) {
      var teamActors = teams[teamIndex].actors || [];
      for (var teamActorIndex = 0; teamActorIndex < teamActors.length; teamActorIndex++) {
        if (String(teamActors[teamActorIndex]) === actorId) {
          return "Wasteland / Quest";
        }
      }
    }

    for (var roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
      var mrHandyList = rooms[roomIndex].mrHandyList || [];
      for (var handyIndex = 0; handyIndex < mrHandyList.length; handyIndex++) {
        if (String(mrHandyList[handyIndex]) === actorId) {
          return roomLocationName(rooms[roomIndex]);
        }
      }
    }

    for (var waitingIndex = 0; waitingIndex < waiting.length; waitingIndex++) {
      var waitingActorId = waiting[waitingIndex] && waiting[waitingIndex].serializeId;
      if (waitingActorId !== undefined && String(waitingActorId) === actorId) {
        return "Vault Door / Awaiting";
      }
    }

    for (var savedRoomIndex = 0; savedRoomIndex < rooms.length; savedRoomIndex++) {
      if (String(rooms[savedRoomIndex].deserializeID) === String(other.savedRoom)) {
        return roomLocationName(rooms[savedRoomIndex]) + " (saved room)";
      }
    }

    return "Unassigned";
  };

  $scope.deleteMrHandy = function () {
    if (!isMrHandy($scope.other)) {
      return;
    }

    if (isActorInWasteland($scope.other.serializeId)) {
      alert("This Mr. Handy is assigned to a wasteland team. Return it to the vault before deleting it.");
      return;
    }

    if (!confirm("Delete this Mr. Handy permanently from the loaded save?")) {
      return;
    }

    deleteMrHandyIds([$scope.other.serializeId]);
    $scope.other = {};
    _otherName = null;
    alert("Deleted Mr. Handy from the loaded save.");
  };

  $scope.deleteAllVaultMrHandies = function () {
    var actors = $scope.save.dwellers.actors;
    var actorIds = [];
    var skipped = 0;

    for (var actorIndex = 0; actorIndex < actors.length; actorIndex++) {
      if (!isMrHandy(actors[actorIndex])) {
        continue;
      }

      if (isActorInWasteland(actors[actorIndex].serializeId)) {
        skipped++;
      }
      else {
        actorIds.push(actors[actorIndex].serializeId);
      }
    }

    if (!actorIds.length) {
      alert(skipped
        ? "All remaining Mr. Handies are assigned to wasteland teams. Return them to the vault before deleting them."
        : "There are no Mr. Handies to delete.");
      return;
    }

    var message = "Delete " + actorIds.length + " Mr. Handies permanently from the loaded save?";
    if (skipped) {
      message += " " + skipped + " assigned to wasteland teams will be skipped.";
    }

    if (!confirm(message)) {
      return;
    }

    var selectedActorId = $scope.other.serializeId;
    deleteMrHandyIds(actorIds);

    if (actorIds.indexOf(selectedActorId) !== -1) {
      $scope.other = {};
      _otherName = null;
    }

    message = "Deleted " + actorIds.length + " Mr. Handies from the loaded save.";
    if (skipped) {
      message += " Skipped " + skipped + " assigned to wasteland teams.";
    }
    alert(message);
  };

  $scope.healAllMrHandies = function () {
    var actors = $scope.save.dwellers.actors || [];
    var healed = 0;

    for (var actorIndex = 0; actorIndex < actors.length; actorIndex++) {
      if (isMrHandy(actors[actorIndex])) {
        actors[actorIndex].health = 5000;
        healed++;
      }
    }

    alert(healed
      ? "Restored " + healed + " Mr. Handies to 5000 health."
      : "There are no Mr. Handies to heal.");
  };

  $scope.maxhappinessAll = function () {
    var sum2 = Object.keys($scope.save.dwellers.dwellers).length;
    for (i = 0; i < sum2; i++)
      $scope.save.dwellers.dwellers[i].happiness.happinessValue = 100;
    alert("Maxed All Dwellers Happiness!");
  };

  $scope.healAll = function () {
    var sum2 = Object.keys($scope.save.dwellers.dwellers).length;
    for (i = 0; i < sum2; i++) {
      $scope.save.dwellers.dwellers[i].health.radiationValue = 0;
      $scope.save.dwellers.dwellers[i].health.healthValue = $scope.save.dwellers.dwellers[i].health.maxHealth;
    }
    alert("Healed All Dwellers!");
  };

  $scope.maxAllDwellersHealth = function () {
    var dwellers = $scope.save.dwellers.dwellers;

    for (var dwellerIndex = 0; dwellerIndex < dwellers.length; dwellerIndex++) {
      dwellers[dwellerIndex].health.healthValue = 644;
      dwellers[dwellerIndex].health.maxHealth = 644;
    }

    alert("Set all dwellers' health and max health to 644.");
  };

  $scope.maxAllDwellersLevel = function () {
    var dwellers = $scope.save.dwellers.dwellers;

    for (var dwellerIndex = 0; dwellerIndex < dwellers.length; dwellerIndex++) {
      dwellers[dwellerIndex].experience.currentLevel = 50;
    }

    alert("Set all dwellers' level to 50.");
  };

  $scope.growUpAllKids = function () {
    var rooms = $scope.save.vault.rooms || [];
    var taskMgr = $scope.save.taskMgr || {};
    var tasks = taskMgr.tasks || [];
    var childTaskIds = [];
    var updated = 0;
    var alreadyDue = 0;
    var missing = 0;
    var now = Number(taskMgr.time);

    if (!isFinite(now)) {
      alert("The save does not contain a valid task clock. No child timers were changed.");
      return;
    }

    for (var roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
      var children = rooms[roomIndex].children || [];

      for (var childIndex = 0; childIndex < children.length; childIndex++) {
        var taskId = Number(children[childIndex].taskID);
        if (isFinite(taskId) && taskId > 0 && childTaskIds.indexOf(taskId) === -1) {
          childTaskIds.push(taskId);
        }
      }
    }

    if (!childTaskIds.length) {
      alert("There are no kids with grow-up timers in this save.");
      return;
    }

    if (!confirm("Make all " + childTaskIds.length
      + " kids ready to grow up the next time Fallout Shelter loads this save?")) {
      return;
    }

    for (var childTaskIndex = 0; childTaskIndex < childTaskIds.length; childTaskIndex++) {
      var growthTask = null;

      for (var taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
        if (tasks[taskIndex].id == childTaskIds[childTaskIndex]) {
          growthTask = tasks[taskIndex];
          break;
        }
      }

      if (!growthTask || !isFinite(Number(growthTask.endTime))) {
        missing++;
        continue;
      }

      if (Number(growthTask.endTime) <= now) {
        alreadyDue++;
        continue;
      }

      growthTask.startTime = Math.min(
        isFinite(Number(growthTask.startTime)) ? Number(growthTask.startTime) : now,
        now
      );
      growthTask.endTime = now;
      updated++;
    }

    var message = "Marked " + (updated + alreadyDue) + " kids ready to grow up."
      + " Fallout Shelter will complete the adult transition when it next loads the save.";
    if (missing) {
      message += " Skipped " + missing + " kids with missing grow-up tasks.";
    }
    alert(message);
  };

  $scope.maxSpecialAll = function () {
    var sum2 = Object.keys($scope.save.dwellers.dwellers).length;
    for (i = 0; i < sum2; i++)
      for (i2 = 0; i2 < 8; i2++)
        $scope.save.dwellers.dwellers[i].stats.stats[i2].value = 10;
    alert("Maxed All Dwellers Stats!");
  };

  $scope.maxSpecial = function () {
    $scope.dweller.stats.stats[1].value = 10;
    $scope.dweller.stats.stats[2].value = 10;
    $scope.dweller.stats.stats[3].value = 10;
    $scope.dweller.stats.stats[4].value = 10;
    $scope.dweller.stats.stats[5].value = 10;
    $scope.dweller.stats.stats[6].value = 10;
    $scope.dweller.stats.stats[7].value = 10;
  };

  $scope.removeRocks = function () {
    $scope.save.vault.rocks = [];
    alert("Removed Rocks!");
  };

  $scope.closeDweller = function (dweller) {
    $scope.dweller = {};
    $scope.dwellerPetId = '';
  };

  $scope.editTeam = function (team) {
    $scope.team = team;
  };

  $scope.closeTeam = function () {
    $scope.team = {};
  };

  $scope.closeOther = function () {
    $scope.other = {};
    $scope.petOwner = {};
    $scope.petItem = {};
    $scope.petDefinition = {};
  };

  $scope.download = function () {
    var petValidationError = validateEditedPets();
    if (petValidationError) {
      $scope.section = 'pets';
      alert("Cannot save: " + petValidationError);
      return;
    }

    encrypt($scope.fileName, $scope.save);
  };

  $scope.clearemergency = function () {
    var sum2 = Object.keys($scope.save.vault.rooms).length;
    for (i = 0; i < sum2; i++) {
      $scope.save.vault.rooms[i].currentStateName = "Idle";
    }
    alert("Cleared Emergency on all rooms!");
  };

  function waitingDwellers() {
    var spawner = $scope.save && $scope.save.dwellerSpawner;
    return spawner && Array.isArray(spawner.dwellersWaiting)
      ? spawner.dwellersWaiting
      : [];
  }

  function waitingDwellerId(waiting) {
    if (!waiting) {
      return null;
    }

    if (waiting.dwellerId !== undefined) {
      return waiting.dwellerId;
    }

    return waiting.dwellerID !== undefined ? waiting.dwellerID : null;
  }

  function isWaitingDweller(waiting) {
    if (!waiting) {
      return false;
    }

    if (waiting.charType !== undefined && waiting.charType !== null) {
      return String(waiting.charType).toLowerCase() === "dweller";
    }

    var dwellerId = waitingDwellerId(waiting);
    return dwellerId !== null && !!findDweller(dwellerId);
  }

  $scope.waitingDwellerCount = function () {
    return waitingDwellers().filter(isWaitingDweller).length;
  };

  $scope.acceptAllDwellersWaiting = function () {
    var waiting = waitingDwellers();
    var acceptedWaiting = waiting.filter(isWaitingDweller);
    var preservedWaiting = waiting.filter(function (entry) {
      return !isWaitingDweller(entry);
    });
    var waitingCount = acceptedWaiting.length;

    if (!waitingCount) {
      alert("There are no Dwellers waiting at the Vault door.");
      return;
    }

    var acceptedIds = [];
    for (var waitingIndex = 0; waitingIndex < acceptedWaiting.length; waitingIndex++) {
      var dwellerId = waitingDwellerId(acceptedWaiting[waitingIndex]);
      if (dwellerId !== null) {
        acceptedIds.push(dwellerId);
      }
    }

    waiting.splice(0, waiting.length);
    for (var preservedIndex = 0; preservedIndex < preservedWaiting.length; preservedIndex++) {
      waiting.push(preservedWaiting[preservedIndex]);
    }
    $scope.clearBulkDwellerSelection();

    for (var acceptedIndex = 0; acceptedIndex < acceptedIds.length; acceptedIndex++) {
      var acceptedDweller = findDweller(acceptedIds[acceptedIndex]);
      if (acceptedDweller && !$scope.isChildDweller(acceptedDweller)) {
        $scope.bulkDwellerSelection[String(acceptedDweller.serializeId)] = true;
      }
    }

    $scope.updateBulkDwellerSelection();
    refreshDwellerEquipmentFilters();

    var result = "Accepted " + waitingCount + " Dwellers waiting at the Vault door.";
    if ($scope.bulkDwellerCount) {
      result += " Selected " + $scope.bulkDwellerCount
        + " of them in the Dwellers tab for bulk actions.";
    }
    if (preservedWaiting.length) {
      result += " Kept " + preservedWaiting.length
        + " non-Dweller entr" + (preservedWaiting.length === 1 ? "y" : "ies")
        + " at the Vault door.";
    }
    alert(result);
  };

  $scope.unlockthemes = function () {
    var themes = $scope.save.survivalW.collectedThemes.themeList || [];

    for (var themeIndex = 0; themeIndex < themes.length; themeIndex++) {
      var extraData = themes[themeIndex].extraData || {};
      extraData.partsCollectedCount = 9;
      extraData.IsCraftingInProgress = false;
      extraData.IsCrafted = true;
      extraData.IsClaimed = true;
      extraData.IsClaimedInCraftingRoom = true;
      extraData.IsNew = true;
      themes[themeIndex].extraData = extraData;
    }

    alert(themes.length
      ? "Unlocked " + themes.length + " themes."
      : "There are no themes in this save to unlock.");
  };

  $scope.colortofos = colortofos;

  $scope.unlockrooms = function () {
    $scope.save.unlockableMgr.objectivesInProgress = [];
    $scope.save.unlockableMgr.completed = [];
    $scope.save.unlockableMgr.claimed = ["StorageUnlock",
      "MedbayUnlock",
      "SciencelabUnlock",
      "OverseerUnlock",
      "RadioStationUnlock",
      "WeaponFactoryUnlock",
      "GymUnlock",
      "DojoUnlock",
      "ArmoryUnlock",
      "ClassUnlock",
      "OutfitFactoryUnlock",
      "CardioUnlock",
      "BarUnlock",
      "GameRoomUnlock",
      "BarberShopUnlock",
      "PowerPlantUnlock",
      "WaterroomUnlock",
      "HydroponicUnlock",
      "NukacolaUnlock",
      "DesignFactoryUnlock"];
    alert("Unlocked Rooms!");
  };

  $scope.unlockrecipes = function () {
    $scope.save.survivalW.recipes = [
      "Shotgun_Rusty",
      "Railgun",
      "LaserPistol_Focused",
      "PlasmaThrower_Boosted",
      "PlasmaThrower_Overcharged",
      "PipePistol_LittleBrother",
      "CombatShotgun_Hardened",
      "Flamer_Rusty",
      "LaserRifle_Tuned",
      "HuntingRifle_OlPainless",
      "PlasmaRifle_Focused",
      "PipeRifle",
      "JunkJet_Tactical",
      "InstitutePistol_Improved",
      "BBGun_RedRocket",
      "032Pistol_Hardened",
      "InstitutePistol_Apotheosis",
      "InstitutePistol_Scattered",
      "InstituteRifle_Excited",
      "PipeRifle_Long",
      "GatlingLaser",
      "PlasmaThrower_DragonsMaw",
      "PlasmaRifle",
      "AssaultRifle_Rusty",
      "AlienBlaster_Destabilizer",
      "Fatman_Guided",
      "Melee_RaiderSword",
      "SniperRifle_Hardened",
      "Melee_BaseballBat",
      "PlasmaRifle_MeanGreenMonster",
      "032Pistol_WildBillsSidearm",
      "GaussRifle",
      "LaserRifle_WaserWifle",
      "InstitutePistol_Scoped",
      "Flamer_Pressurized",
      "AssaultRifle_ArmorPiercing",
      "Railgun_Rusty",
      "Minigun_Hardened",
      "InstituteRifle_VirgilsRifle",
      "JunkJet_Electrified",
      "Flamer_Hardened",
      "GatlingLaser_Focused",
      "Magnum_Hardened",
      "Railgun_Railmaster",
      "Melee_PoolCue",
      "Minigun_Enhanced",
      "GaussRifle_Rusty",
      "JunkJet_RecoilCompensated",
      "Pistol_LoneWanderer",
      "MissilLauncher",
      "LaserPistol",
      "InstitutePistol_Incendiary",
      "BBGun_ArmorPiercing",
      "Rifle_ArmorPiercing",
      "AssaultRifle_Enhanced",
      "LaserRifle_Rusty",
      "CombatShotgun",
      "GatlingLaser_Tuned",
      "SawedOffShotgun_Hardened",
      "PlasmaThrower_Agitated",
      "Magnum_Blackhawk",
      "AssaultRifle_Infiltrator",
      "PlasmaPistol_MPLXNovasurge",
      "HuntingRifle_ArmorPiercing",
      "Railgun_Enhanced",
      "SniperRifle_Enhanced",
      "GaussRifle_Accelerated",
      "PlasmaThrower_Tactical",
      "CombatShotgun_Rusty",
      "PipeRifle_Bayoneted",
      "GaussRifle_Hardened",
      "PlasmaThrower",
      "AlienBlaster_Focused",
      "SawedOffShotgun_Kneecapper",
      "Flamer_Enhanced",
      "Railgun_Hardened",
      "GaussRifle_Magnetro4000",
      "PipePistol_Auto",
      "SniperRifle_ArmorPiercing",
      "PipeRifle_NightVision",
      "MissilLauncher_Enhanced",
      "PipeRifle_Calibrated",
      "LaserMusket",
      "Rifle_Hardened",
      "Fatman_Enhanced",
      "JunkJet",
      "PlasmaRifle_Amplified",
      "Minigun_Rusty",
      "Melee_FireHydrantBat",
      "GatlingLaser_Amplified",
      "JunkJet_Flaming",
      "Shotgun_DoubleBarrelled",
      "LaserPistol_Amplified",
      "AlienBlaster_Amplified",
      "InstituteRifle_NightVision",
      "SniperRifle_VictoryRifle",
      "PlasmaPistol",
      "Minigun_LeadBelcher",
      "Melee_ButcherKnife",
      "AssaultRifle",
      "Shotgun_Hardened",
      "MissilLauncher_Hardened",
      "LaserRifle_Focused",
      "AlienBlaster",
      "Melee_Pickaxe",
      "032Pistol_ArmorPiercing",
      "SniperRifle",
      "Pistol_ArmorPiercing",
      "PlasmaPistol_Tuned",
      "Melee_KitchenKnife",
      "AssaultRifle_Hardened",
      "Fatman_Hardened",
      "Shotgun_FarmersDaughter",
      "CombatShotgun_CharonsShotgun",
      "AlienBlaster_Rusty",
      "GatlingLaser_Vengeance",
      "InstituteRifle_Long",
      "JunkJet_TechniciansRevenge",
      "LaserPistol_SmugglersEnd",
      "Flamer_Burnmaster",
      "SniperRifle_Rusty",
      "InstituteRifle",
      "MissilLauncher_MissLauncher",
      "InstituteRifle_Targeting",
      "Fatman_Rusty",
      "Rifle_LincolnsRepeater",
      "PipeRifle_BigSister",
      "Fatman",
      "GatlingLaser_Rusty",
      "Fatman_Mirv",
      "PlasmaPistol_Focused",
      "Shotgun_Enhanced",
      "PipePistol_Scoped",
      "Minigun",
      "InstitutePistol",
      "ProfessorSpecial",
      "PiperSpecial",
      "AllNightware_Lucky",
      "KnightSpecial",
      "BowlingShirt",
      "HunterGear_Bounty",
      "BattleArmor_Sturdy",
      "ColonelSpecial",
      "UtilityJumpsuit_Sturdy",
      "DooWopOutfit",
      "PowerArmor_51f",
      "PowerArmor_MkVI",
      "PowerArmor_51d",
      "PowerArmor_51a",
      "BishopSpecial",
      "FlightSuit_Advanced",
      "SodaFountainDress",
      "HandymanJumpsuit_Expert",
      "HandymanJumpsuit_Advanced",
      "GreaserSpecial",
      "ThreedogSpecial",
      "WastelandSurgeon_Doctor",
      "PowerArmor_T45f",
      "CromwellSpecial",
      "PowerArmor_T45d",
      "WandererArmor_Sturdy",
      "LifeguardOutfit",
      "WrestlerSpecial",
      "EngineerSpecial",
      "MilitaryJumpsuit_Officer",
      "PrestonSpecial",
      "HazmatSuit_Heavy",
      "CombatArmor_Heavy",
      "RaiderArmor_Sturdy",
      "SlasherSpecial",
      "AlistairSpecial",
      "SurvivorSpecial",
      "AllNightware_Naughty",
      "InstituteJumper_Advanced",
      "SurgeonSpecial",
      "MayorSpecial",
      "RiotGear_Sturdy",
      "ScifiSpecial",
      "MetalArmor_Sturdy",
      "BOSUniform",
      "SynthArmor_Heavy",
      "Vest",
      "BittercupSpecial",
      "SoldierSpecial",
      "UtilityJumpsuit_Heavy",
      "HunterGear_Mutant",
      "AbrahamSpecial",
      "EulogyJonesSpecial",
      "PowerArmor_MkIV",
      "BaseballUniform",
      "PowerArmor_T60a",
      "PowerArmor_T60d",
      "FormalWear_Lucky",
      "PowerArmor_T60f",
      "Swimsuit",
      "LabCoat_Expert",
      "LabCoat_Advanced",
      "EmpressSpecial",
      "LibrarianSpecial",
      "KingSpecial",
      "MilitaryJumpsuit_Commander",
      "ScribeRobe",
      "BOSUniform_Expert",
      "LucasSpecial",
      "PrinceSpecial",
      "WandererArmor_Heavy",
      "RadiationSuit_Expert",
      "ScientistScrubs_Commander",
      "HazmatSuit_Sturdy",
      "MetalArmor_Heavy",
      "ButchSpecial",
      "ComedianSpecial",
      "RaiderArmor_Heavy",
      "FlightSuit_Expert",
      "SportsfanSpecial",
      "RothchildSpecial",
      "LabCoat",
      "BattleArmor",
      "BattleArmor_Heavy",
      "CombatArmor",
      "CombatArmor_Sturdy",
      "WandererArmor",
      "RaiderArmor",
      "WastelandSurgeon",
      "HunterGear_Treasure",
      "RiotGear",
      "RiotGear_Heavy",
      "SequinDress",
      "WastelandSurgeon_Settler",
      "HandymanJumpsuit",
      "MechanicJumpsuit",
      "InstituteJumper_Expert",
      "UtilityJumpsuit",
      "AllNightware",
      "WorkDress",
      "MilitaryJumpsuit",
      "FormalWear",
      "FormalWear_Fancy",
      "CheckeredShirt",
      "SweaterVest",
      "PowerArmor",
      "PowerArmor_MkI",
      "ScribeRobe_Initiate",
      "ScribeRobe_Elder",
      "RadiationSuit_Advanced",
      "RadiationSuit",
      "MoviefanSpecial",
      "NinjaSuit",
      "FlightSuit",
      "HazmatSuit",
      "BOSUniform_Advanced",
      "ScientistScrubs_Officer",
      "ScientistScrubs",
      "PolkaDotDress",
      "032Pistol",
      "032Pistol_Enhanced",
      "032Pistol_Rusty",
      "AlienBlaster_Tuned",
      "BBGun",
      "BBGun_Enhanced",
      "BBGun_Hardened",
      "BBGun_Rusty",
      "CombatShotgun_DoubleBarrelled",
      "CombatShotgun_Enhanced",
      "Flamer",
      "GaussRifle_Enhanced",
      "HuntingRifle",
      "HuntingRifle_Enhanced",
      "HuntingRifle_Hardened",
      "HuntingRifle_Rusty",
      "LaserPistol_Rusty",
      "LaserPistol_Tuned",
      "LaserRifle",
      "LaserRifle_Amplified",
      "Magnum",
      "Magnum_ArmorPiercing",
      "Magnum_Enhanced",
      "Magnum_Rusty",
      "Minigun_ArmorPiercing",
      "MissilLauncher_Guided",
      "MissilLauncher_Rusty",
      "PipePistol",
      "PipePistol_HairTrigger",
      "PipePistol_Heavy",
      "Pistol",
      "Pistol_Enhanced",
      "Pistol_Hardened",
      "Pistol_Rusty",
      "PlasmaPistol_Amplified",
      "PlasmaPistol_Rusty",
      "PlasmaRifle_Rusty",
      "PlasmaRifle_Tuned",
      "Railgun_Accelerated",
      "Rifle",
      "Rifle_Enhanced",
      "Rifle_Rusty",
      "SawedOffShotgun",
      "SawedOffShotgun_DoubleBarrelled",
      "SawedOffShotgun_Enhanced",
      "SawedOffShotgun_Rusty",
      "Shotgun"];
      alert("Unlocked Recipes!");
  }

  function extractCount() {
    if ($scope.save.vault.LunchBoxesByType.toString().indexOf("0") > -1) {
      _lunchboxCount = $scope.save.vault.LunchBoxesByType.toString().match(/0/g).length;
    } else {
      _lunchboxCount = 0;
    }

    if ($scope.save.vault.LunchBoxesByType.toString().indexOf("1") > -1) {
      _handyCount = $scope.save.vault.LunchBoxesByType.toString().match(/1/g).length;
    } else {
      _handyCount = 0;
    }

    if ($scope.save.vault.LunchBoxesByType.toString().indexOf("2") > -1) {
      _petCarrierCount = $scope.save.vault.LunchBoxesByType.toString().match(/2/g).length;
    } else {
      _petCarrierCount = 0;
    }

    if ($scope.save.vault.LunchBoxesByType.toString().indexOf("3") > -1) {
      _starterPackCount = $scope.save.vault.LunchBoxesByType.toString().match(/3/g).length;
    } else {
      _starterPackCount = 0;
    }

    $scope.lunchboxCount = _lunchboxCount;
    $scope.handyCount = _handyCount;
    $scope.petCarrierCount = _petCarrierCount;
    $scope.starterPackCount = _starterPackCount;
  }

  function updateCount() {
    var types = $scope.save.vault.LunchBoxesByType = [],
      count = $scope.save.vault.LunchBoxesCount = _lunchboxCount + _handyCount + _petCarrierCount + _starterPackCount;

    for (var i = 0; i < _lunchboxCount; i++) {
      types.push(0);
    }

    for (var i = 0; i < _handyCount; i++) {
      types.push(1);
    }

    for (var i = 0; i < _petCarrierCount; i++) {
      types.push(2);
    }

    for (var i = 0; i < _starterPackCount; i++) {
      types.push(3);
    }
  }

  function extractTeams() {
    $scope.wastelandTeams = [];
    $scope.wastelandTeams2 = [];

    var wasteland = $scope.save && $scope.save.vault && $scope.save.vault.wasteland;
    var teams = wasteland && Array.isArray(wasteland.teams) ? wasteland.teams : [];

    teams.forEach(function (team) {
      var dwellerIds = Array.isArray(team.dwellers) ? team.dwellers : [];
      var actorIds = Array.isArray(team.actors) ? team.actors : [];

      dwellerIds.forEach(function (dwellerId) {
        var dweller = findDweller(dwellerId);
        if (!dweller) {
          return;
        }

        $scope.wastelandTeams.push({
          teamIndex: team.teamIndex,
          dweller: dweller,
          elapsedTimeAliveExploring: team.elapsedTimeAliveExploring,
          returnTripDuration: team.returnTripDuration,
          teamEquipment: team.teamEquipment
        });
      });

      actorIds.forEach(function (actorId) {
        var actor = findActor(actorId);
        if (!isMrHandy(actor)) {
          return;
        }

        $scope.wastelandTeams2.push({
          teamIndex: team.teamIndex,
          actor: actor,
          elapsedTimeAliveExploring: team.elapsedTimeAliveExploring,
          returnTripDuration: team.returnTripDuration,
          teamEquipment: team.teamEquipment
        });
      });
    });
  }

  function findDweller(id) {
    var dweller = null;
    $scope.save.dwellers.dwellers.forEach(function (d) {
      if (d.serializeId == id) {
        dweller = d;
      }
    });
    return dweller;
  }

  function findActor(id) {
    var actor = null;
    $scope.save.dwellers.actors.forEach(function (d) {
      if (d.serializeId == id) {
        actor = d;
      }
    });
    return actor;
  }

  function updateTeam() {
    $scope.save.vault.wasteland.teams.forEach(function (team) {
      if (team.teamIndex == $scope.team.teamIndex) {
        team.elapsedTimeAliveExploring = $scope.team.elapsedTimeAliveExploring;
        team.returnTripDuration = $scope.team.returnTripDuration;
        team.teamEquipment = $scope.team.teamEquipment;
      }
    });
  }

  $scope.dwellerweaponlist = {
    "032Pistol": '.32 Pistol',
    Pistol: '10mm Pistol',
    GaussRifle_Accelerated: 'Accelerated Gauss Rifle',
    Railgun_Accelerated: 'Accelerated Railway Rifle',
    PlasmaThrower_Agitated: 'Agitated Plasma Thrower',
    AlienBlaster: 'Alien Blaster',
    AmataPistol: "Amata's Pistol",
    AlienBlaster_Amplified: 'Amplified Alien Blaster',
    GatlingLaser_Amplified: 'Amplified Gatling Laser',
    LaserPistol_Amplified: 'Amplified Laser Pistol',
    LaserRifle_Amplified: 'Amplified Laser Rifle',
    PlasmaPistol_Amplified: 'Amplified Plasma Pistol',
    PlasmaRifle_Amplified: 'Amplified Plasma Rifle',
    InstitutePistol_Apotheosis: 'Apotheosis',
    "032Pistol_ArmorPiercing": 'Armor Piercing .32 Pistol',
    Pistol_ArmorPiercing: 'Armor Piercing 10mm Pistol',
    AssaultRifle_ArmorPiercing: 'Armor Piercing Assault Rifle',
    BBGun_ArmorPiercing: 'Armor Piercing BB Gun',
    HuntingRifle_ArmorPiercing: 'Armor Piercing Hunting Rifle',
    Rifle_ArmorPiercing: 'Armor Piercing Lever-Action Rifle',
    Minigun_ArmorPiercing: 'Armor Piercing Minigun',
    Magnum_ArmorPiercing: 'Armor Piercing Scoped .44',
    SniperRifle_ArmorPiercing: 'Armor Piercing Sniper Rifle',
    AssaultRifle: 'Assault Rifle',
    PipePistol_Auto: 'Auto Pipe Pistol',
    Melee_BaseballBat: 'Baseball Bat',
    PipeRifle_Bayoneted: 'Bayoneted Pipe Rifle',
    BBGun: 'BB Gun',
    PipeRifle_BigSister: 'Big Sister',
    Magnum_Blackhawk: 'Blackhawk',
    PlasmaThrower_Boosted: 'Boosted Plasma Thrower',
    Flamer_Burnmaster: 'Burnmaster',
    Melee_ButcherKnife: 'Butcher Knife',
    PipeRifle_Calibrated: 'Calibrated Pipe Rifle',
    CombatShotgun_CharonsShotgun: "Charon's Shotgun",
    CombatShotgun: 'Combat Shotgun',
    AlienBlaster_Destabilizer: 'Destabilizer',
    CombatShotgun_DoubleBarrelled: 'Double-Barrel Combat Shotgun',
    SawedOffShotgun_DoubleBarrelled: 'Double-Barrel Sawed-Off Shotgun',
    Shotgun_DoubleBarrelled: 'Double-Barrel Shotgun',
    PlasmaThrower_DragonsMaw: "Dragon's Maw",
    JunkJet_Electrified: 'Electrified Junk Jet',
    "032Pistol_Enhanced": 'Enhanced .32 Pistol',
    Pistol_Enhanced: 'Enhanced 10mm Pistol',
    AssaultRifle_Enhanced: 'Enhanced Assault Rifle',
    BBGun_Enhanced: 'Enhanced BB Gun',
    CombatShotgun_Enhanced: 'Enhanced Combat Shotgun',
    Fatman_Enhanced: 'Enhanced Fat Man',
    Flamer_Enhanced: 'Enhanced Flamer',
    GaussRifle_Enhanced: 'Enhanced Gauss Rifle',
    HuntingRifle_Enhanced: 'Enhanced Hunting Rifle',
    Rifle_Enhanced: 'Enhanced Lever-Action Rifle',
    Minigun_Enhanced: 'Enhanced Minigun',
    MissilLauncher_Enhanced: 'Enhanced Missile Launcher',
    Railgun_Enhanced: 'Enhanced Railway Rifle',
    SawedOffShotgun_Enhanced: 'Enhanced Sawed-Off Shotgun',
    Magnum_Enhanced: 'Enhanced Scoped .44',
    Shotgun_Enhanced: 'Enhanced Shotgun',
    SniperRifle_Enhanced: 'Enhanced Sniper Rifle',
    InstituteRifle_Excited: 'Excited Institute Rifle',
    Shotgun_FarmersDaughter: "Farmer's Daughter",
    Fatman: 'Fat Man',
    Melee_FireHydrantBat: 'Fire Hydrant Bat',
    Fist: 'Fist',
    Flamer: 'Flamer',
    JunkJet_Flaming: 'Flaming Junk Jet',
    AlienBlaster_Focused: 'Focused Alien Blaster',
    GatlingLaser_Focused: 'Focused Gatling Laser',
    LaserPistol_Focused: 'Focused Laser Pistol',
    LaserRifle_Focused: 'Focused Laser Rifle',
    PlasmaPistol_Focused: 'Focused Plasma Pistol',
    PlasmaRifle_Focused: 'Focused Plasma Rifle',
    GatlingLaser: 'Gatling Laser',
    GaussRifle: 'Gauss Rifle',
    Fatman_Guided: 'Guided Fat Man',
    MissilLauncher_Guided: 'Guided Missile Launcher',
    PipePistol_HairTrigger: 'Hair Trigger Pipe Pistol',
    "032Pistol_Hardened": 'Hardened .32 Pistol',
    Pistol_Hardened: 'Hardened 10mm Pistol',
    AssaultRifle_Hardened: 'Hardened Assault Rifle',
    BBGun_Hardened: 'Hardened BB Gun',
    CombatShotgun_Hardened: 'Hardened Combat Shotgun',
    Fatman_Hardened: 'Hardened Fat Man',
    Flamer_Hardened: 'Hardened Flamer',
    GaussRifle_Hardened: 'Hardened Gauss Rifle',
    HuntingRifle_Hardened: 'Hardened Hunting Rifle',
    Rifle_Hardened: 'Hardened Lever-Action Rifle',
    Minigun_Hardened: 'Hardened Minigun',
    MissilLauncher_Hardened: 'Hardened Missile Launcher',
    Railgun_Hardened: 'Hardened Railway Rifle',
    SawedOffShotgun_Hardened: 'Hardened Sawed-Off Shotgun',
    Magnum_Hardened: 'Hardened Scoped .44',
    Shotgun_Hardened: 'Hardened Shotgun',
    SniperRifle_Hardened: 'Hardened Sniper Rifle',
    PipePistol_Heavy: 'Heavy Pipe Pistol',
    LeverActionRifle_Henrietta: 'Henrietta',
    HuntingRifle: 'Hunting Rifle',
    InstitutePistol_Improved: 'Improved Institute Pistol',
    InstitutePistol_Incendiary: 'Incendiary Institute Pistol',
    AssaultRifle_Infiltrator: 'Infiltrator',
    InstitutePistol: 'Institute Pistol',
    InstituteRifle: 'Institute Rifle',
    JunkJet: 'Junk Jet',
    Melee_KitchenKnife: 'Kitchen Knife',
    SawedOffShotgun_Kneecapper: 'Kneecapper',
    LaserMusket: 'Laser Musket',
    LaserPistol: 'Laser Pistol',
    LaserRifle: 'Laser Rifle',
    Minigun_LeadBelcher: 'Lead Belcher',
    Rifle: 'Lever-Action Rifle',
    Rifle_LincolnsRepeater: "Lincoln's Repeater",
    PipePistol_LittleBrother: 'Little Brother',
    Pistol_LoneWanderer: 'Lone Wanderer',
    InstituteRifle_Long: 'Long Institute Rifle',
    PipeRifle_Long: 'Long Pipe Rifle',
    GaussRifle_Magnetro4000: 'Magnetron 4000',
    PlasmaRifle_MeanGreenMonster: 'Mean Green Monster',
    Minigun: 'Minigun',
    Fatman_Mirv: 'MIRV',
    MissilLauncher_MissLauncher: 'Miss Launcher',
    MissilLauncher: 'Missile Launcher',
    PlasmaPistol_MPLXNovasurge: 'MPXL Novasurge',
    InstituteRifle_NightVision: 'Night-Vision Institute Rifle',
    PipeRifle_NightVision: 'Night-Vision Pipe Rifle',
    HuntingRifle_OlPainless: "Ol' Painless",
    PlasmaThrower_Overcharged: 'Overcharged Plasma Thrower',
    Melee_Pickaxe: 'Pickaxe',
    PipePistol: 'Pipe Pistol',
    PipeRifle: 'Pipe Rifle',
    PlasmaPistol: 'Plasma Pistol',
    PlasmaRifle: 'Plasma Rifle',
    PlasmaThrower: 'Plasma Thrower',
    PoliceBaton: 'PoliceBaton',
    Melee_PoolCue: 'Pool Cue',
    Flamer_Pressurized: 'Pressurized Flamer',
    Railgun_Railmaster: 'Railmaster',
    Railgun: 'Railway Rifle',
    JunkJet_RecoilCompensated: 'Recoil Compensated Junk Jet',
    BBGun_RedRocket: 'Red Rocket',
    Melee_RaiderSword: 'Relentless Raider Sword',
    "032Pistol_Rusty": 'Rusty .32 Pistol',
    Pistol_Rusty: 'Rusty 10mm Pistol',
    AlienBlaster_Rusty: 'Rusty Alien Blaster',
    AssaultRifle_Rusty: 'Rusty Assault Rifle',
    BBGun_Rusty: 'Rusty BB Gun',
    CombatShotgun_Rusty: 'Rusty Combat Shotgun',
    Fatman_Rusty: 'Rusty Fat Man',
    Flamer_Rusty: 'Rusty Flamer',
    GatlingLaser_Rusty: 'Rusty Gatling Laser',
    GaussRifle_Rusty: 'Rusty Gauss Rifle',
    HuntingRifle_Rusty: 'Rusty Hunting Rifle',
    LaserPistol_Rusty: 'Rusty Laser Pistol',
    LaserRifle_Rusty: 'Rusty Laser Rifle',
    Rifle_Rusty: 'Rusty Lever-Action Rifle',
    Minigun_Rusty: 'Rusty Minigun',
    MissilLauncher_Rusty: 'Rusty Missile Launcher',
    PlasmaPistol_Rusty: 'Rusty Plasma Pistol',
    PlasmaRifle_Rusty: 'Rusty Plasma Rifle',
    Railgun_Rusty: 'Rusty Railway Rifle',
    SawedOffShotgun_Rusty: 'Rusty Sawed-Off Shotgun',
    Magnum_Rusty: 'Rusty Scoped .44',
    Shotgun_Rusty: 'Rusty Shotgun',
    SniperRifle_Rusty: 'Rusty Sniper Rifle',
    SawedOffShotgun: 'Sawed-Off Shotgun',
    InstitutePistol_Scattered: 'Scattered Institute Pistol',
    Magnum: 'Scoped .44',
    InstitutePistol_Scoped: 'Scoped Institute Pistol',
    PipePistol_Scoped: 'Scoped Pipe Pistol',
    Shotgun: 'Shotgun',
    LaserPistol_SmugglersEnd: "Smuggler's End",
    BumperSword: 'Sniper Rifle',
    SniperRifle: 'Sniper Rifle',
    JunkJet_Tactical: 'Tactical Junk Jet',
    PlasmaThrower_Tactical: 'Tactical Plasma Thrower',
    InstituteRifle_Targeting: 'Targeting Institute Rifle',
    JunkJet_TechniciansRevenge: "Technician's Revenge",
    AlienBlaster_Tuned: 'Tuned Alien Blaster',
    GatlingLaser_Tuned: 'Tuned Gatling Laser',
    LaserPistol_Tuned: 'Tuned Laser Pistol',
    LaserRifle_Tuned: 'Tuned Laser Rifle',
    PlasmaPistol_Tuned: 'Tuned Plasma Pistol',
    PlasmaRifle_Tuned: 'Tuned Plasma Rifle',
    GatlingLaser_Vengeance: 'Vengeance',
    SniperRifle_VictoryRifle: 'Victory Rifle',
    InstituteRifle_VirgilsRifle: "Virgil's Rifle",
    LaserRifle_WaserWifle: 'Wazer Wifle',
    "032Pistol_WildBillsSidearm": "Wild Bill's Sidearm"
  };

  $scope.dwelleroutfitslist = {
    AbrahamSpecial: "Abraham's Relaxedwear",
    AlistairSpecial: "Tenpenny's Suit",
    AllNightware: 'Nightwear',
    AllNightware_Lucky: 'Lucky Nightwear',
    AllNightware_Naughty: 'Naughty Nightwear',
    AmataSpecial: "Amata's Jumpsuit",
    ArgyleSweater: 'Accountant Outfit',
    BaseballUniform: 'Baseball Uniform',
    BattleArmor: 'Battle Armor',
    BattleArmor_Heavy: 'Heavy Battle Armor',
    BattleArmor_Sturdy: 'Sturdy Battle Armor',
    BishopSpecial: 'Clergy Outfit',
    BittercupSpecial: "Bittercup's Outfit",
    BOSUniform: 'BoS Uniform',
    BOSUniform_Advanced: 'Advanced BoS Uniform',
    BOSUniform_Expert: 'Expert BoS Uniform',
    BowlingShirt: 'Drag Racer',
    BusinessDress: 'Agent Provocateur',
    BusinessSuit: 'Business Suit',
    ButchSpecial: "Tunnel Snakes' Outfit",
    CheckeredShirt: 'Spring Casualwear',
    ColonelSpecial: "Autumn's Uniform",
    CombatArmor: 'Combat Armor',
    CombatArmor_Heavy: 'Heavy Combat Armor',
    CombatArmor_Sturdy: 'Sturdy Combat Armor',
    ComedianSpecial: 'Comedian Outfit',
    costume_01: 'Casual01',
    costume_02: 'Casual02',
    costume_03: 'Casual03',
    costume_04: 'Casual04',
    costume_05: 'Casual05',
    costume_06: 'Casual06',
    costume_07: 'Casual07',
    costume_08: 'Casual08',
    costume_09: 'Casual09',
    costume_10: 'Casual10',
    CromwellSpecial: "Confessor Cromwell's Rags",
    Detective: 'Detective Outfit',
    DooWopOutfit: 'Doo-Wop Singer',
    DrLiSpecial: "Doctor Li's Outfit",
    ElderLyonsSpecial: "Elder Lyon's Robe",
    EmpressSpecial: 'Republic Robes',
    EngineerSpecial: 'Engineer Outfit',
    EulogyJonesSpecial: "Eulogy Jones' Suit",
    FarHarborSpecial: 'Tattered Longcoat',
    FlightSuit: 'Flight Suit',
    FlightSuit_Advanced: 'Advanced Flight Suit',
    FlightSuit_Expert: 'Expert Flight Suit',
    FormalWear: 'Formal Wear',
    FormalWear_Fancy: 'Fancy Formal Wear',
    FormalWear_Lucky: 'Lucky Formal Wear',
    GreaserSpecial: 'Greaser Outfit',
    HandymanJumpsuit: 'Handyman Jumpsuit',
    HandymanJumpsuit_Advanced: 'Advanced Jumpsuit',
    HandymanJumpsuit_Expert: 'Expert Jumpsuit',
    HarknessSpecial: "Harkness' Security Uniform",
    HazmatSuit: 'Wasteland Gear',
    HazmatSuit_Heavy: 'Heavy Wasteland Gear',
    HazmatSuit_Sturdy: 'Sturdy Wasteland Gear',
    Horseman_DeathJacket: "Death's Jacket",
    Horseman_FamineVestment: "Famine's Vestment",
    Horseman_PestilencePlating: "Pestilence's Plating",
    Horseman_WarArmor: "War's Armor",
    HunterGear_Bounty: 'Bounty Hunter Gear',
    HunterGear_Mutant: 'Mutant Hunter Gear',
    HunterGear_Treasure: 'Treasure Hunter Gear',
    InstituteJumper_Advanced: 'Advanced Institute Jumper',
    InstituteJumper_Expert: 'Expert Institute Jumper',
    JacketTshirt: 'Motorcycle Jacket',
    JamesSpecial: "Dad's Lab Uniform",
    JerichoSpecial: "Jericho's Leather Armor",
    JobinsonsJersey: "Rackie Jobinson's Jersey",
    jumpsuit: 'Vault Suit',
    KingSpecial: 'Medieval Ruler Outfit',
    KnightSpecial: 'Knight Armor',
    LabCoat: 'Lab Coat',
    LabCoat_Advanced: 'Advanced Lab Coat',
    LabCoat_Expert: 'Expert Lab Coat',
    LibrarianSpecial: 'Librarian Outfit',
    LifeguardOutfit: 'Lifeguard Outfit',
    LoungeShirt: 'Bowling Shirt',
    LucasSpecial: "Sheriff's Duster",
    MayorSpecial: 'Mayor Outfit',
    MechanicJumpsuit: 'Mechanic Jumpsuit',
    MetalArmor_Heavy: 'Heavy Metal Armor',
    MetalArmor_Sturdy: 'Sturdy Metal Armor',
    MetalArmorRaiderBoss: 'MetalArmorRaiderBoss',
    MilitaryJumpsuit: 'Military Fatigues',
    MilitaryJumpsuit_Commander: 'Commander Fatigues',
    MilitaryJumpsuit_Officer: 'Officer Fatigues',
    MoiraSpecial: "Moira's RobCo Jumpsuit",
    MoviefanSpecial: 'Movie Fan Outfit',
    MrBurkeSpecial: 'Mr',
    NinjaSuit: 'Ninja Outfit',
    NormalClothing: 'NormalClothing',
    PiperSpecial: "Piper's Outfit",
    PolkaDotDress: 'Polka Dot Sundress',
    PowerArmor: 'T-45a Power Armor',
    PowerArmor_51a: 'T-51a Power Armor',
    PowerArmor_51d: 'T-51d Power Armor',
    PowerArmor_51f: 'T-51f Power Armor',
    PowerArmor_MkI: 'X-01 Mk I Power Armor',
    PowerArmor_MkIV: 'X-01 Mk IV Power Armor',
    PowerArmor_MkVI: 'X-01 Mk VI Power Armor',
    PowerArmor_T45d: 'T-45d Power Armor',
    PowerArmor_T45f: 'T-45f Power Armor',
    PowerArmor_T60a: 'T-60a Power Armor',
    PowerArmor_T60d: 'T-60d Power Armor',
    PowerArmor_T60f: 'T-60f Power Armor',
    PrestonSpecial: 'Minuteman Uniform',
    PrinceSpecial: 'Nobility Outfit',
    ProfessorSpecial: 'Professor Outfit',
    RadiationSuit: 'Radiation Suit',
    RadiationSuit_Advanced: 'Advanced Radiation Suit',
    RadiationSuit_Expert: 'Expert Radiation Suit',
    RaiderArmor: 'Raider Armor',
    RaiderArmor_Heavy: 'Heavy Raider Armor',
    RaiderArmor_Sturdy: 'Sturdy Raider Armor',
    RiotGear: 'Merc Gear',
    RiotGear_Heavy: 'Heavy Merc Gear',
    RiotGear_Sturdy: 'Sturdy Merc Gear',
    RothchildSpecial: "Scribe Rothchild's Robe",
    SantaSuit_Original: 'Original Santa Suit',
    SarahSpecial: "Lyon's Pride Armor",
    ScientistScrubs: 'Junior Officer Uniform',
    ScientistScrubs_Commander: 'Commander Uniform',
    ScientistScrubs_Officer: 'Officer Uniform',
    ScifiSpecial: 'Sci-Fi Fan Outfit',
    ScribeRobe: 'Scribe Robe',
    ScribeRobe_Elder: 'Elder Robe',
    ScribeRobe_Initiate: 'Initiate Robe',
    SequinDress: 'Vault Socialite',
    SlasherSpecial: 'Horror Fan Outfit',
    SodaFountainDress: 'Soda Fountain Dress',
    SoldierSpecial: 'Soldier Uniform',
    SpecialThemeHalloween: 'Ghost Costume',
    SpecialThemeHalloween2: 'Skeleton Costume',
    SpecialThemeThanksGiving: 'Pilgrim Outfit',
    SpecialThemeXmas: 'Santa Suit',
    SpecialThemeXmas2: 'Elf Outfit',
    SportsfanSpecial: 'Sports Fan Outfit',
    StarPaladinSpecial: "Cross' Power Armor",
    SurgeonSpecial: 'Surgeon Outfit',
    SurvivorSpecial: 'Survivor Armor',
    Suspenders: 'Bespoke Attire',
    SweaterVest: 'Pre-War Suburbanite',
    Swimsuit: 'Swimsuit',
    SwingDress: 'Swing Dress',
    SynthArmor_Heavy: 'Heavy Synth Armor',
    ThreedogSpecial: "Three Dog's Outfit",
    TiedBlouse: 'Country Girl',
    UtilityJumpsuit: 'Armored Vault Suit',
    UtilityJumpsuit_Heavy: 'Heavy Vault Suit',
    UtilityJumpsuit_Sturdy: 'Sturdy Vault Suit',
    Vest: 'Post-War Casanova',
    WaitressUniform: 'Waitress Uniform',
    WandererArmor: 'Leather Armor',
    WandererArmor_Heavy: 'Heavy Leather Armor',
    WandererArmor_Sturdy: 'Sturdy Leather Armor',
    WastelandSurgeon: 'Wasteland Surgeon',
    WastelandSurgeon_Doctor: 'Wasteland Doctor',
    WastelandSurgeon_Settler: 'Wasteland Medic',
    WorkDress: 'Rural Schoolmarm',
    WrestlerSpecial: 'Wrestler Outfit'
  };

  refreshEquipmentSelectionOptions();
});

function preset(preset, saveFileName) {

  /*
  if(isLoaded){
    if(window.location.href.indexOf("?") > -1){
      window.location.href = window.location.href.substring(0,window.location.href.indexOf("?")) +  "?preset=" + preset + "?savename=" + saveFileName;
    }else{
      window.location.href = window.location.href +  "?preset=" + preset + "?savename=" + saveFileName;

    }
    throw new Error("There already is a savefile loaded.")

  }  */ // Why does this matter?

  file = "presets/" + preset + ".json";

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = readPreset;
  xhr.open("GET", file, true);
  xhr.send();

  function readPreset() {
    if (xhr.readyState == 4) {
      var resp = JSON.parse(xhr.responseText);
      $('.instructions').hide();

      edit(saveFileName, resp);
    }
  };
}
