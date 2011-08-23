﻿// ------------------------------------------------------------------------------------------------------------------------
//
//  ██████       ██              ██                    
//  ██           ██              ██                    
//  ██     █████ ██ █████ █████ █████ █████ ████ █████ 
//  ██████ ██ ██ ██ ██ ██ ██     ██   ██ ██ ██   ██    
//      ██ █████ ██ █████ ██     ██   ██ ██ ██   █████ 
//      ██ ██    ██ ██    ██     ██   ██ ██ ██      ██ 
//  ██████ █████ ██ █████ █████  ████ █████ ██   █████ 
//
// ------------------------------------------------------------------------------------------------------------------------
// Selectors - global selector functions to be used by all Selector functions

	var Selectors =
	{
		/**
		 * 
		 * @param	expression	{String}		A CSS expression
		 * @param	items		{Array}			An array of items to filter
		 * @param	scope		{Object}		A valid scope reference. Valid types are Library, Document, Timeline, Layer, Frame
		 * @param	debug		{Boolean}		An optional flag to print Selector information to the Output panel
		 * @returns				{Array}			An array of elements, items, etc
		 */
		select:function(expression, items, scope, debug)
		{
			// --------------------------------------------------------------------------------
			// setup
			
				// define selection type from scope
					var matches = String(scope).match(/(Library|Document|Timeline|Layer|Frame)/);
					if(matches)
					{
						var types =
						{
							'Library':		'Item',
							'Document':		'Element',
							'Timeline':		'Layer',
							'Layer':		'Frame'
						}
						var type = types[matches[1]];
					}
					else
					{
						throw new TypeError('TypeError: Invalid scope ' +scope+ ' supplied to Selector.select()');
					}
	
			// --------------------------------------------------------------------------------
			// process rules
			
				// exit early if universal selector is supplied
					if(expression == '*')
					{
						return items;
					}
			
				// variables
					var rules	= xjsfl.utils.trim(expression).split(/,/g);
					var results	= [];
					
				// get items
					for each (var rule in rules)
					{
						// parse rule into selector array
							var selectors = this.parse(rule, type);
							
						// debug
							if(debug)
							{
								Output.inspect(selectors, 'Selectors for "' + rule + '"');
							}
							
						// get items
							var _results = Selectors.test(selectors, items, scope)
							results = results.concat(_results);
					}
				
				// ensure items are unique
					results = xjsfl.utils.toUniqueArray(results);
					
				// return
					return results;
		},
		

		/**
		 * parse a selector expression into selectors - also called from :not()
		 * @param	rule	{String}	A CSS rule
		 * @param	type	{String}	The type of parse
		 * @returns		
		 */
		parse:function(rule, type)
		{
			// --------------------------------------------------------------------------------
			// setup
			
				// chunker
					/*
						#  type             match
						-------------------------------------------------
						1: combo			:not(selector)
						   2: type			:not
						   3: selector		:bitmap
						4: name				this is a name
						5: path				/this is/a path
						6: Class			.Class
						7: package			.com.domain.package.Class
						8: pseudo			:type
						9: attribute		[attribute=value]
						   10:  name		attribute
						   11:  operand		=
						   12: value		value
					*/
					//var chunker = /(:([\-\w]+)\((.+)\))|([\*\d\w][\-\w\d\s_*{|}]+)|\/([\-\w\s\/_*{|}]+)|\.([*A-Z][\w*]+)|\.([a-z][\w.*]+)|:([a-z]\w+)|\[((\w+)([\^$*!=<>]{1,2})?(.+?)?)\]/g;
					var chunker = /(:([\-\w]+)\((.+)\))|([A-Za-z_*][\-\w\s_.*{|}]*)|\/([\-\w\s\/_*{|}]+)|:([*A-Z][\w*]+)|:([a-z][\w*]+\.[a-z][\w.*]+)|:([a-z]\w+)|\[((\w+)([\^$*!=<>]{1,2})?(.+?)?)\]/g;
	
				// variables
					var exec,
						selector,
						selectors = [],
						typeTests = Selectors[type.toLowerCase()],
						coreTests = Selectors.core;
						
				// debug
					//trace('\n\n\n\n--------------------------------------------------------------------------------\n' + rule + '\n--------------------------------------------------------------------------------')
				
			// --------------------------------------------------------------------------------
			// parse
			
				while(exec = chunker.exec(rule))
				{
					// --------------------------------------------------------------------------------
					// setup
					
						// debug
							//Output.inspect(exec);
							//trace(limit++);
							
						// create
							selector = new Selector(exec[0]);
						
					// --------------------------------------------------------------------------------
					// create selector
					
						// 1: combo ":not(:bitmap)"
							if(exec[1])
							{
								selector.type	= 'combo';
								selector.name	= exec[2];
								selector.method	= coreTests.combo[selector.name];
								selector.params	= [null, Selector.makeRX(exec[3], selector)];
							}
							
						// 4: name "this is a name"
							else if(exec[4])
							{
								selector.type	= 'filter';
								selector.type	= 'name';
								selector.method	= typeTests.filter.name;
								selector.params	= [null, Selector.makeRX(exec[4], selector), selector.range];
							}
							
						// 5: path "/path/to/item"
							else if(exec[5])
							{
								selector.type	= 'filter';
								selector.name	= 'path';
								selector.method	= typeTests.filter.path;
								selector.params	= [null, Selector.makeRX(exec[5], selector), selector.range];
							}
							
						// 6: Class ".Class"
							else if(exec[6])
							{
								selector.type	= 'filter';
								selector.name	= 'class';
								selector.method	= typeTests.filter.Class;
								selector.params	= [null, Selector.makeRX(exec[6], selector)];
							}
							
						// 7: package ".com.domain.package.Class"
							else if(exec[7])
							{
								selector.type	= 'filter';
								selector.name	= 'package';
								selector.method	= typeTests.filter.Package;
								selector.params	= [null, Selector.makeRX(exec[7], selector)];
							}
							
						// 8: pseudo ":type"
							else if(exec[8])
							{
								// variables
									var name = exec[8];
									var method;
									
								// types
									if(exec[8].match(/selected|children|descendants|parent|first|last/))
									{
										selector.type	= 'find';
										method			= typeTests.find[exec[8]];
									}
									else if(exec[8].match(/exported|empty|animated|keyframed|scripted|audible/))
									{
										selector.type	= 'pseudo';
										method			= typeTests.pseudo[exec[8]];
									}
									else
									{
										selector.type	= 'type'; // should this be 'filter'?
										method			= typeTests.filter.type;
									}
									
								// assign
									selector.name	= name;
									selector.method	= method;
									selector.params	= [null, exec[8]];
							}
							
						// 9: attribute "[attribute=value]"
							else if(exec[9])
							{
								// selector properties
									selector.type	= 'filter';
									selector.name	= 'attribute';
									selector.method	= coreTests.filter.attribute;
									
								// attribute components
									var attName		= exec[10];
									var attOperand	= exec[11];
									var attValue	= exec[12];
									var val			= parseFloat(attValue);
									
								// parse numeric values
									if( ! isNaN(val) )// /<>/.test(attOperand)
									{
										attValue = val;
									}
									else
									{
										attValue = Selector.makeRX(exec[12], selector);
									}
									
								// assign
									selector.params	= [null, attName, attOperand, attValue, selector.range];
							}
							
					// --------------------------------------------------------------------------------
					// assign selector, or throw error
					
							//trace('TYPE:' + selector);
							
						// finally, add selector
							if(selector.method)
							{
								selectors.push(selector);
							}
							else
							{
								throw new TypeError('TypeError: Unrecognised selector "' +selector.pattern+ '" in ' +type+ 'Selector function');
							}
						
				}
			
			// debug	
				//Output.inspect(selectors, 'SELECTORS');
				
			// return
				return selectors;
		},
		
		/**
		 * Tests the selectors against the supplied items and returns matches
		 * @param	selectors	{Array}			An array of Selector instances
		 * @param	items		{Array}			An array of items to filter
		 * @param	scope		{Object}		A valid scope reference. Valid types are Library, Document, Timeline, Layer, Frame
		 * @returns				{Array}			An array of elements, items, etc
		 */
		test:function(selectors, items, scope)
		{
			// exit early if no valid selectors
				if(selectors.length === 0)
				{
					return [];
				}
			
			// loop over all selectors
				for each(var selector in selectors)
				{
					// debug
						//trace(selector);
						
					// store temporary items as we find and filter
						var temp	= [];
						
					// filter items as a group, with any extra processing taking place in the testing function
						if(selector.type === 'find')
						{
							temp = selector.find(items, scope);
						}
						
					// filter items with one test per item
						else
						{
							var state;
							for each(var item in items)
							{
								state = selector.test(item, scope);
								if(state)
								{
									temp.push(item);
								}
							}
						}
						
					// update items with temp items
						items = temp;
						
					// exit early if 0 items
						if(items.length == 0)
						{
							break;
						}
				}
				
			// return
				return items;
		}
		
	}
	
	Selectors.core =
	{
		/**
		 * 
		 */
		filter:
		{
			/**
			 * Test an attribute of an object against a value
			 * @param	item		{Object}	The item to test
			 * @param	name		{String}	The name of the attribute
			 * @param	operand		{String}	The operand type. Acceptable string values are =, !=, ^=, $=, *=. Acceptable numeric values are =, !=, >, >=, <, <=
			 * @param	value		{String}	The value to test against. Acceptable values are Numbers, Strings
			 * @param	value		{Number}	The value to test against. 
			 * @returns				{Boolean}	True if the test passes
			 */
			attribute:function(item, name, operand, value, range)
			{
				// no operand, just test for property
					if(operand == '')
					{
						//trace('EXISTS')
						for(var prop in item)
						{
							if(prop === name)
							{
								return true;
							}
						}
						return false;
					}
					
				// numeric operand (>, >=, <, <=)
					if(typeof value === 'number' && range == undefined)
					{
						//trace('NUMERIC')
						var prop = item[name];
						switch(operand)
						{
							case '=':		return prop == value;
							case '!=':		return prop != value;
							case '<':		return prop < value;
							case '<=':		return prop <= value;
							case '>':		return prop > value;
							case '>=':		return prop >= value;
						}
					}
				
				// range comparison (={min|max} converted to range object {min:n, max:m})
					if(range)
					{
						//trace('RANGE');
						var prop = item[name];
						return prop >= range.min && prop <= range.max;
					}
					
				// RegExp comparison (^=, $=, *=)
					//TODO Complete RegExp comparison
					if(value instanceof RegExp)
					{
						//trace('REGEXP')
						var prop = String(item[name]);
						return value.test(prop);
					}
				
				// finally, string operand (=, !=)
					//trace('STRING');
					switch(operand)
					{
						case '=':		return prop === value;
						case '!=':		return prop !== value;
						default:		return false;
					}
			}

		},
		
		math:
		{
			
			range:function(str, range)
			{
				var value = parseFloat(str);
				return value >= range.min && value <= range.max;
				/*
				var matches = String(value).match(/([\d+\.])/);
				if(matches)
				{
					value = parseFloat(matches[1]);
					return value >= range.min && value <= range.max;
				}
				return false;
				*/
			}
			
		},
		
		find:
		{
			
		},
		
		pseudo:
		{
			
		},
		
		combo:
		{
			//TODO filter() functionality 
			/**
			 * 
			 * @param	selector	
			 * @returns		
			 */
			filter:function(callback)
			{
				// filter keeps
				return callback();
			},
			
			not:function(callback)
			{
				// not discards
				return ! callback();
			},
			
			//TODO not() functionality 
			/**
			 * 
			 * @param	selector		
			 * @param	test		
			 * @returns		
			 */
			not:function(items, selector)
			{
				trace('NOT ' + selector)
				// get the items with the new selecor
					var newItems = Selectors.select(selector, items, this);
					
					Output.inspect(newItems)
				
				// compare to items in
					return newItems
				
			},
			
			//TODO contains() functionality - should this be custom per type, i.e. items, elements, frames?
			/**
			 * 
			 * @param	selector	
			 * @returns		
			 */
			contains:function(selector)
			{
				
			},
			
			//TODO nth()
			/**
			 * 
			 * @param	selector	
			 * @returns		
			 */
			nth:function(selector)
			{
				
			}
		
		}
		
	}
	
	Selectors.element =
	{
		
		filter:
		{
			/**
			 * 
			 * @param	item	{Item}		An Element
			 * @param	rx		{RegExp}	A regular expression to match against the item name
			 * @returns			{Boolean}	True if matched, false if failed
			 */
			name:function(item, rx, range)
			{
				return Selectors.item.filter.path(item, rx, range);
			},
			
			/**
			 * 
			 * @param	item	{Item}		An Element
			 * @param	rx		{RegExp}	A regular expression to match against the item path
			 * @returns			{Boolean}	True if matched, false if failed
			 */
			path:function(item, rx, range)
			{
				if(item.libraryItem)
				{
					return Selectors.item.filter.path(item.libraryItem, rx, range);
				}
				else
				{
					return false;
				}
			},
			
			/**
			 * 
			 * @param	item	{Item}		An Element
			 * @param	type	{String}	A valid Item itemType
			 * @returns			{Boolean}	True if matched, false if failed
			 */
			type:function(item, type)
			{
				switch(item.elementType)
				{
					// --------------------------------------------------------------------------------
					// instance: symbol, bitmap, embedded video, linked video, video, compiled clip
					
						//TODO Add video
						
						case 'instance':
							
							// symbol: button, movieclip, graphic
								if(item.symbolType)
								{
									if(type === 'symbol')
									{
										return true;
									}
									return item.symbolType.replace(/ /g, '') == type;
								}
								
							// instance
								return item.instanceType.replace(/ /g, '') == type;
							
						break;
					
					// --------------------------------------------------------------------------------
					// text: text, static, dynamic, input
					
						case 'text':
							
							if(type === 'text')
							{
								return true;
							}
							return item.textType.replace(/ /g, '') == type;
							
						break;
					
					// --------------------------------------------------------------------------------
					// shape: group, shape
					
						case 'shape':
							if(item.isRectangleObject || item.isOvalObject)
							{
								return type == 'primitive';
							}
							if(item.isGroup)
							{
								return type == 'group';
							}
							return type == 'shape';
						break;
				}
				
				return false;
					
			}

		},
		
		find:
		{
			selected:function(items)
			{
				return this.selection;
			}
		},
		
		pseudo:
		{
			/**
			 * 
			 * @param	item	
			 * @returns		
			 */
			empty:function(element)
			{
				if(element.symbolType)
				{
					return Selectors.timeline.pseudo.empty(element.libraryItem.timeline);
				}
				return false;
			},
			
			/**
			 * 
			 * @param	element	
			 * @returns		
			 */
			animated:function(element)
			{
				if(element.symbolType)
				{
					return Selectors.timeline.pseudo.animated(element.libraryItem.timeline);
				}
				return false;
			},
			
			/**
			 * 
			 * @param	element	
			 * @returns		
			 */
			keyframed:function(element)
			{
				if(element.symbolType)
				{
					return Selectors.timeline.pseudo.keyframed(element.libraryItem.timeline);
				}
				return false;
			},
			
			/**
			 * 
			 * @param	element	
			 * @returns		
			 */
			scripted:function(element)
			{
				if(element.symbolType)
				{
					return Selectors.timeline.pseudo.scripted(element.libraryItem.timeline);
				}
				return false;
			},
			
			/**
			 * 
			 * @param	element	
			 * @returns		
			 */
			audible:function(element)
			{
				if(element.symbolType)
				{
					return Selectors.timeline.pseudo.audible(element.libraryItem.timeline);
				}
				return false;
			}
		}

	}
	
	Selectors.item  =
	{
		filter:
		{
			/**
			 * 
			 * @param	item	{Item}		A library Item instance
			 * @param	rx		{RegExp}	A regular expression to match against the item name
			 * @returns			{Boolean}	True if matched, false if failed
			 */
			name:function(item, rx, range)
			{
				var name	= item.name.split('/').pop();
				var matches	= name.match(rx);
				if(matches)
				{
					if(range)
					{
						return Selectors.core.math.range(matches[1], range);
					}
					return true;
				}
				return false;
			},
			
			/**
			 * 
			 * @param	item	{Item}		A library Item instance
			 * @param	rx		{RegExp}	A regular expression to match against the item path
			 * @returns			{Boolean}	True if matched, false if failed
			 */
			path:function(item, rx, range)
			{
				var matches	= item.name.match(rx);
				if(matches)
				{
					if(range)
					{
						return Selectors.core.math.range(matches[1], range);
					}
					return true;
				}
				return false;
			},
			
			/**
			 * 
			 * @param	item	{Item}		A library Item instance
			 * @param	rx		{RegExp}	A regular expression to match against the item's full linkageClassName
			 * @returns			{Boolean}	True if matched, false if failed
			 */
			Package:function(item, rx)
			{
				if(item['linkageClassName'])
				{
					return rx.test(item.linkageClassName);
				}
				return false;
			},
			
			/**
			 * 
			 * @param	item	{Item}		A library Item instance
			 * @param	rx		{RegExp}	A regular expression to match against the Class component of the item'slinkageClassName
			 * @returns			{Boolean}	True if matched, false if failed
			 */
			Class:function(item, rxClass)
			{
				if(item['linkageClassName'])
				{
					return rxClass.test(item.linkageClassName);
				}
				return false;
			},
			
			/**
			 * 
			 * @param	item	{Item}		A library Item instance
			 * @param	type	{String}	A valid Item itemType
			 * @returns			{Boolean}	True if matched, false if failed
			 */
			type:function(item, type)
			{
				// remove spaces from item type
					var itemType = item.itemType.replace(/ /g, '');

				// common selector for symbols
					if(type === 'symbol')
					{
						return /movieclip|graphic|button/.test(itemType);
					}
					
				// special case for videos
					if(itemType === 'video' && type.match(/linkedvideo|embeddedvideo/))
					{
						return item.videoType === type;
					}
					
				// undefined, component, movieclip, graphic, button, folder, font, sound, bitmap, compiledclip, screen
					else
					{
						return itemType === type;
					}
			}
			
		},
		
		find:
		{
			/**
			 * 
			 * @param	items	
			 * @returns		
			 */
			first:function(items)
			{
				return [items.shift()];
			},
			
			/**
			 * 
			 * @param	items	
			 * @returns		
			 */
			last:function(items)
			{
				return [items.pop()];
			},
			
			/**
			 * 
			 * @param	items	
			 * @returns		
			 */
			parent:function(items)
			{
				// loop through items and grab all parent paths
					var parent, paths = [];
					for each(var item in items)
					{
						if(item.name.indexOf('/') > -1)
						{
							parent = item.name.replace(/\/[^/]+$/, '')
							paths.push(parent);
						}
					}
					
				// make array unique
					paths = xjsfl.utils.toUniqueArray(paths);
					
					Output.inspect(paths)
					
				// grab folders from library
					var index, temp = [];
					for each(var path in paths)
					{
						index = this.findItemIndex(path);
						if(index != '')
						{
							temp.push(this.items[index]);
						}
					}
					
				// return 
					return temp;
			},
			
			/**
			 * 
			 * @param	items	
			 * @param	parent	
			 * @returns		
			 */
			children:function(parents)
			{
				var items = [];
				for each(var parent in parents)
				{
					// skip non- folder items (as they won't have children)
						if(parent.itemType !== 'folder')
						{
							continue;
						}
						
					// check against all other items in the library
						for each(var item in this.items)
						{
							if(item !== parent && item.name.indexOf(parent.name) == 0)
							{
								var path = item.name.substr(parent.name.length + 1);
								if(path.indexOf('/') === -1)
								{
									items.push(item);
								}
							}
						}
					
				}
				return items;
			},
			
			/**
			 * 
			 * @param	items	
			 * @param	parent	
			 * @returns		
			 */
			descendants:function(parents)
			{
				var items = [];
				for each(var parent in parents)
				{
					// skip non- folder items (as they won't have children)
						if(parent.itemType !== 'folder')
						{
							continue;
						}
						
					// check against all other items in the library
						for each(var item in this.items)
						{
							if(item !== parent && item.name.indexOf(parent.name) == 0)
							{
								items.push(item);
							}
						}
					
				}
				return items;
			},
			
			/**
			 * 
			 * @param	item	
			 * @returns		
			 */
			selected:function(items)
			{
				return this.getSelectedItems();
			}
			
		},
		
		pseudo:
		{
			/**
			 * 
			 * @param	item	
			 * @returns		
			 */
			exported:function(item)
			{
				return item.linkageExportForAS === true;
			},
			
			timeline:function(item)
			{
				return /movie clip|graphic|button/.test(item.itemType);
			},
			
			/**
			 * 
			 * @param	item	
			 * @returns		
			 */
			empty:function(item)
			{
				if(item.itemType === 'folder')
				{
					var children = Selectors.item.find.children.apply(this, [[item]]);
					return children.length == 0;;
				}
				else if(Selectors.item.filter.type(item, 'symbol'))
				{
					return Selectors.timeline.pseudo.empty(item.timeline);
				}
				return false;
			},
			
			/**
			 * 
			 * @param	item	
			 * @returns		
			 */
			animated:function(item)
			{
				if(Selectors.item.filter.type(item, 'symbol'))
				{
					return Selectors.timeline.pseudo.animated(item.timeline);
				}
				return false;
			},
			
			/**
			 * 
			 * @param	item	
			 * @returns		
			 */
			keyframed:function(item)
			{
				if(Selectors.item.filter.type(item, 'symbol'))
				{
					return Selectors.timeline.pseudo.keyframed(item.timeline);
				}
				return false;
			},
			
			/**
			 * 
			 * @param	item	
			 * @returns		
			 */
			scripted:function(item)
			{
				if(Selectors.item.filter.type(item, 'symbol'))
				{
					return Selectors.timeline.pseudo.scripted(item.timeline);
				}
				return false;
			},
			
			/**
			 * 
			 * @param	item	
			 * @returns		
			 */
			audible:function(item)
			{
				if(Selectors.item.filter.type(item, 'symbol'))
				{
					return Selectors.timeline.pseudo.audible(item.timeline);
				}
				return false;
			}
			
		}				
	}

	Selectors.timeline =
	{
		pseudo:
		{
			/**
			 * 
			 * @param	item	
			 * @returns		
			 */
			empty:function(timeline)
			{
				return ! Iterators.layers(timeline, null, function (frame){ return frame.elements.length > 0; });
			},
			
			/**
			 * 
			 * @param	element	
			 * @returns		
			 */
			animated:function(timeline)
			{
				return Iterators.layers(timeline, null, function (frame){ return frame.tweenType != 'none'; } );
			},
			
			/**
			 * 
			 * @param	element	
			 * @returns		
			 */
			keyframed:function(timeline)
			{
				return Iterators.layers(timeline, null, function (frame){ return frame.startFrame > 0 && frame.elements.length > 0; } );
			},
			
			/**
			 * 
			 * @param	element	
			 * @returns		
			 */
			scripted:function(timeline)
			{
				return Iterators.layers(timeline, null, function (frame){ return frame.actionScript != ''; });
			},
			
			/**
			 * 
			 * @param	element	
			 * @returns		
			 */
			audible:function(timeline)
			{
				return Iterators.layers(timeline, null, function (frame){ return frame.soundLibraryItem != null; });
			}
		}
	}

	
	xjsfl.classes.register('Selectors', Selectors);