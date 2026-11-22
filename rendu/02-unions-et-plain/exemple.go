package main

type Either[V any] struct {
	Kind        uint8 // 0: Right, 1: Left, 2: Success, 3: Fail, 4: Plain
	Information string
	Value       V
}

func (e Either[V]) IsRight() bool {
	return e.Kind == 0 || e.Kind == 2
}

// Inlining de whenIsRight avec coalescing sans passer par une closure sur le tas
func WrapIfRight(result Either[float64]) Either[[]float64] {
	if result.IsRight() {
		return Either[[]float64]{
			Kind:  result.Kind,
			Value: []float64{result.Value}, // coalescing inliné
		}
	}
	return Either[[]float64]{
		Kind:        result.Kind,
		Information: result.Information,
	}
}
