package main

type Either[V any] struct {
	Kind        uint8
	Information string
	Value       V
}

func (e Either[V]) IsRight() bool {
	return e.Kind == 0 || e.Kind == 2
}

// Structure bivariée pour séparer le type de l'échec et celui de la collection
type Either2[L, R any] struct {
	Kind        uint8
	Information string
	Left        L
	Right       R
}

func Group(steps []Either[float64]) Either2[float64, []float64] {
	out := make([]float64, len(steps))
	for i, step := range steps {
		if !step.IsRight() {
			return Either2[float64, []float64]{
				Kind:        step.Kind,
				Information: step.Information,
				Left:        step.Value,
			}
		}
		out[i] = step.Value
	}
	return Either2[float64, []float64]{
		Kind:  2, // Success
		Right: out,
	}
}
