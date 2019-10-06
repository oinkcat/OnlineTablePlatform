#----------------------------------------------------------#
# field_changes.l - Функции изменения состояния сервера    #
#----------------------------------------------------------#

# Изменение - текстовое сообщение
func addMessageChange(this, text, nSeconds, sendTo)
	Add(this.changes, { 
		type: "message",
		message: text,
		duration: nSeconds,
		to: sendTo
	})
	return this
end

# Изменение - добавление новой сущности
func addNewEntityChange(this, entityData, sendTo)
	Add(this.changes, {
		type: "new_entity",
		id: entityData.id,
		name: entityData.name,
		position: entityData.pos,
		rotation: entityData.rotation,
		layout: entityData.group,
		to: sendTo
	})
	return this
end

# Изменение - добавление списка новых сущностей
func addBatchEntitiesChange(this, batchData, sendTo)
	addingObjects = []
	
	for batchData as entityData
		Add(addingObjects, {		
			id: entityData.id,
			name: entityData.name,
			position: entityData.pos,
			rotation: entityData.rotation,
			layout: entityData.group
		})
	end
	
	Add(this.changes, {
		type: "new_entity",
		entities: addingObjects,
		to: sendTo
	})
	
	return this
end

# Изменение - удаление сущностей
func addRemoveEntitiesChange(this, ids, sendTo)
	Add(this.changes, {
		type: "remove_entity",
		entityIds: ids,
		to: sendTo
	})
	return this
end

# Изменение - перемещение сущности
func addMoveEntityChange(this, id, pos, angles, group, sendTo)
	Add(this.changes, {
		type: "move_entity",
		entityId: id,
		targetPosition: pos,
		targetRotation: angles,
		targetLayout: group,
		to: sendTo
	})
	return this
end

# Изменение - изменение свойства сеанса
func addPropertyChange(this, pKey, pValue)
	Add(this.changes, {
		type: "property",
		key: pKey,
		value: pValue,
		to: "*"
	})
	return this
end

# Изменение - ход нового игрока
func addTurnChange(this, seat)
	Add(this.changes, {
		type: "turn",
		seatIdx: seat,
		to: "*"
	})
	return this
end

# Создать набор изменений
func NewChangeSet() => return new {
	changes: [],
	showMessage: ref addMessageChange,
	changeProperty: ref addPropertyChange,
	addEntity: ref addNewEntityChange,
	addBatch: ref addBatchEntitiesChange,
	removeEntities: ref addRemoveEntitiesChange,
	moveEntity: ref addMoveEntityChange,
	changeTurn: ref addTurnChange,
	
	# Специальное - вызвать событие по таймауту
	setTimeout: func(this, delay)
		Add(this.changes, { type: "timeout", seconds: delay })
	end,
	# Специальное - добавить новые определения объектов
	addDefinitions: func(this, tmpl, names)
		Add(this.changes, {
			type: "new_definitions",
			template: tmpl,
			defNames: names
		})
	end
}