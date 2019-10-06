import native events, math
import field_changes

N_CARDS = 180

# Состояние игры
state = {
	players: [0, 0, 0, 0, 0, 0, 0],
	started: false,
	deck: NewCardDeck()
}

# Создать колоду карт для игры
func NewCardDeck()
	allCards = RangeArray(0, N_CARDS - 1)
	# Перемешать колоду карт
	for RangeArray(0, N_CARDS - 1) as idx
		newIdx = math.Int(math.Rand() * N_CARDS)
		temp = allCards[newIdx]
		allCards[newIdx] = allCards[idx]
		allCards[idx] = temp
	end

	return new {
		cards: allCards,
		dealOne: func(this)
			firstCard = this.cards[0]
			Delete(this.cards, 0)
			return firstCard
		end
	}
end

# Раздать игроку начальные объекты
func givePlayerItems(playerIdx, changeSet)
	gemsGroup = "gems_${playerIdx + 1}"
	gemId = "gem${playerIdx + 1}"
	
	initialState = [
		# 2 камня - черный и белый
		{ name: "stone1", group: gemsGroup },
		{ name: "stone2", group: gemsGroup },
		# Несколько кристаллов
		{ name: gemId, group: gemsGroup }
	]
	
	changeSet.addBatch(initialState, "*")
end

# Инициализировать нового игрока
func initializePlayer(idx)
	state.players[idx] = 1
	
	message = "Игрок #${idx} присоединился!"
	
	changeSet = field_changes.NewChangeSet().showMessage(message, 3, "*")
	givePlayerItems(idx, changeSet)
	# changeSet.setTimeout(5)
	
	return changeSet
end

# Сессия запущена
func onStarted(dummy)
	# Добавить определения карт
	cardDefs = []
	
	for RangeArray(0, N_CARDS - 1) as idx
		Add(cardDefs, "card${idx}")
	end
	
	changeSet = field_changes.NewChangeSet()
	changeSet.addDefinitions("card", cardDefs)
	
	return changeSet.changes
end

# Новый игрок присоединился
func onPlayerEntered(data)
	# Инициализация объектов при первом входе
	if state.players[data.playerIdx] == 0
		return initializePlayer(data.playerIdx).changes
	else
		return null
	end
end

# Прошел временной интервал
func onTimeout(data)
	changeSet = field_changes.NewChangeSet()
	changeSet.showMessage("Выберите сектор", null, "*")
	changeSet.changeProperty("stage", "select_sector")
	
	return changeSet.changes
end

# Игроком запрошена карта
func onCardRequested(data)
	changeSet = field_changes.NewChangeSet()
	
	if state.players[data.playerIdx] < 7
		newCard = state.deck.dealOne()
		changeSet.addEntity({
			name: "card${newCard}",
			group: "cards_${data.playerIdx + 1}",
			rotation: [math.PI, 0, 0]
		}, "*")
		
		state.players[data.playerIdx] += 1
	end
	
	return changeSet.changes
end

# Объект передается другому пользователю
func onGiveObjectToAnother(data)
	changeSet = field_changes.NewChangeSet()
	
	targetGroup = "score_${data.sectNumber}"
	changeSet.moveEntity(data.objId, null, null, targetGroup, "*")
	
	return changeSet.changes
end

# Назначить обработчики событий
events.MapHandlers({
	initialize: ref onStarted,
	new_player: ref onPlayerEntered,
	timeout: ref onTimeout,
	card: ref onCardRequested,
	give_object: ref onGiveObjectToAnother
})
events.StartLoop()