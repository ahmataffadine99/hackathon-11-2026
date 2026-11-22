package main

type Either[V any] struct {
	Kind        uint8
	Information string
	Value       V
}

// Le ternaire est fidèlement traduit en if/else sans évaluation anticipée
func Add(one, two float64) Either[float64] {
	if one < 0 || two < 0 {
		var operand float64
		if one < 0 {
			operand = one
		} else {
			operand = two
		}
		return Either[float64]{
			Kind:        1, // Left
			Information: "negative-operand",
			Value:       operand,
		}
	}
	return Either[float64]{
		Kind:        2, // Success
		Information: "success",
		Value:       one + two,
	}
}
