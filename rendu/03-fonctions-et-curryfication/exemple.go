package main

type Either[V any] struct {
	Kind        uint8
	Information string
	Value       V
}

func (e Either[V]) IsRight() bool {
	return e.Kind == 0 || e.Kind == 2
}

// pipe(result, whenIsRight(coalescing)) devient un appel séquentiel direct
func ApplyPipe(result Either[float64]) Either[[]float64] {
	step := func(input Either[float64]) Either[[]float64] {
		if input.IsRight() {
			return Either[[]float64]{Kind: input.Kind, Value: []float64{input.Value}}
		}
		return Either[[]float64]{Kind: input.Kind, Information: input.Information}
	}(result)

	return step
}
